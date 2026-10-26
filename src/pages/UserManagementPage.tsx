import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { LoadError } from "../components/shared/LoadError";
import { useAuth } from "../context/useAuth";
import {
  fetchCompanyMembers,
  createCompanyUser,
  updateUserRole,
  toggleUserActiveStatus,
  deleteCompanyUser,
  sendUserPasswordReset,
} from "../services/userManagementService";
import { InviteUserModal } from "../components/user-management/InviteUserModal";
import { UserManagementPageHeader } from "../components/user-management/UserManagementPageHeader";
import { UserManagementToolbar } from "../components/user-management/UserManagementToolbar";
import { UserTable } from "../components/user-management/UserTable";
import type { UserFilterState } from "../components/user-management/UserFilterPopover";
import type { UserProfile } from "../types/auth";
import { downloadCsv } from "../utils/downloadCsv";
import { getRoleLabel } from "../utils/getRoleLabel";

export const UserManagementPage: React.FC = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);
  const pageSize = 25;
  const refreshMembers = () => {
    for (const key of ["companyMembers", "review-employees", "timesheet-users", "adminDashboard"]) {
      void queryClient.invalidateQueries({ queryKey: [key] });
    }
  };
  const onActionError = (error: unknown) => setActionError(error instanceof Error ? error.message : t("users.actionFailed"));
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [sendingResetEmail, setSendingResetEmail] = useState<string | null>(null);

  const [filters, setFilters] = useState<UserFilterState>({
    role: "all",
    status: "all",
  });
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);

  const { data: members = [], isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["companyMembers", profile?.company_id, profile?.role],
    queryFn: () => fetchCompanyMembers(profile?.company_id, profile?.role),
    enabled: Boolean(profile),
  });

  const inviteMutation = useMutation({
    mutationFn: (data: {
      email: string;
      full_name: string;
      role: "company_admin" | "regular";
    }) =>
      createCompanyUser({
        ...data,
        company_id: profile!.company_id,
      }),
    onSuccess: () => {
      refreshMembers();
    },
  });

  const deleteUserMutation = useMutation({
    onMutate: () => setActionError(null),
    onError: onActionError,
    mutationFn: (userId: string) => deleteCompanyUser(userId),
    onSuccess: () => {
      refreshMembers();
    },
  });

  const handleDeleteUser = async (userId: string, fullName: string) => {
    if (isActionPending) return;
    if (window.confirm(t("users.confirmDeleteUser", { fullName }))) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleSendPasswordReset = async (email: string) => {
    if (sendingResetEmail) return;
    try {
      setSendingResetEmail(email);
      await sendUserPasswordReset(email);
      alert(t("users.passwordResetSent"));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("users.failedSendReset");
      alert(message);
    } finally {
      setSendingResetEmail(null);
    }
  };

  const updateRoleMutation = useMutation({
    onMutate: () => setActionError(null),
    onError: onActionError,
    mutationFn: ({
      userId,
      role,
    }: {
      userId: string;
      role: "company_admin" | "regular";
    }) => updateUserRole(userId, role),
    onSuccess: () => {
      refreshMembers();
    },
  });

  const toggleStatusMutation = useMutation({
    onMutate: () => setActionError(null),
    onError: onActionError,
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      toggleUserActiveStatus(userId, isActive),
    onSuccess: () => {
      refreshMembers();
    },
  });

  const isActionPending = deleteUserMutation.isPending || updateRoleMutation.isPending || toggleStatusMutation.isPending;

  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      `${member.full_name ?? ""} ${member.email ?? ""}`.toLowerCase().includes(searchTerm.trim().toLowerCase());

    const matchesRole = filters.role === "all" || member.role === filters.role;

    const matchesStatus =
      filters.status === "all" ||
      (filters.status === "active" && member.is_active) ||
      (filters.status === "inactive" && !member.is_active);

    const matchesCompany = !filters.company?.trim() ||
      (member.companies?.name ?? "").toLowerCase().includes(filters.company.trim().toLowerCase());
    return matchesSearch && matchesRole && matchesStatus && matchesCompany;
  });

  const handleUpdateRole = (member: UserProfile, role: "company_admin" | "regular") => {
    if (!isActionPending && member.role !== role) updateRoleMutation.mutate({ userId: member.id, role });
  };

  const handleToggleStatus = (member: UserProfile) => {
    if (!isActionPending) toggleStatusMutation.mutate({ userId: member.id, isActive: !member.is_active });
  };

  const activePage = Math.min(currentPage, Math.max(1, Math.ceil(filteredMembers.length / pageSize)));
  const pageMembers = filteredMembers.slice((activePage - 1) * pageSize, activePage * pageSize);

  return (
    <div className="mx-auto w-full space-y-6 pb-10">
      <UserManagementPageHeader
        onInviteClick={() => setIsInviteModalOpen(true)}
      />

      <UserManagementToolbar
        searchTerm={searchTerm}
        onSearchChange={value => { setSearchTerm(value); setCurrentPage(1); }}
        filters={filters}
        onFiltersChange={value => { setFilters(value); setCurrentPage(1); }}
        isFilterPopoverOpen={isFilterPopoverOpen}
        onFilterPopoverToggle={() => setIsFilterPopoverOpen((open) => !open)}
        onFiltersReset={() => { setFilters({ role: "all", status: "all", company: "" }); setCurrentPage(1); }}
        exportDisabled={isLoading || isError || filteredMembers.length === 0}
        onExport={() => downloadCsv("team-members.csv", [
          [t("users.member"), t("users.emailAddress"), t("users.role"), t("users.status")],
          ...filteredMembers.map(member => [member.full_name, member.email, getRoleLabel(member.role), t(member.is_active ? "users.active" : "users.inactive")]),
        ])}
      />

      {isError ? <LoadError onRetry={() => { void refetch(); }} retrying={isFetching} /> : null}

      {actionError ? <div role="alert" className="rounded-xl border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger">{actionError}</div> : null}

      <UserTable
        members={pageMembers}
        currentPage={activePage}
        pageSize={pageSize}
        totalCount={filteredMembers.length}
        onPageChange={setCurrentPage}
        actionsPending={isActionPending}
        isLoading={isLoading}
        sendingResetEmail={sendingResetEmail}
        onSendPasswordReset={handleSendPasswordReset}
        onToggleStatus={handleToggleStatus}
        onDeleteUser={(member) => handleDeleteUser(member.id, member.full_name)}
        onUpdateRole={handleUpdateRole}
        isSuperAdmin={profile?.role === "super_admin"}
      />

      <InviteUserModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSubmit={(data) => inviteMutation.mutateAsync(data)}
        isLoading={inviteMutation.isPending}
      />
    </div>
  );
};
