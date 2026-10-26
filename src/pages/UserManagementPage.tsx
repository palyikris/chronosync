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
      queryClient.invalidateQueries({ queryKey: ["companyMembers"] });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => deleteCompanyUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companyMembers"] });
    },
  });

  const handleDeleteUser = async (userId: string, fullName: string) => {
    if (window.confirm(t("users.confirmDeleteUser", { fullName }))) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleSendPasswordReset = async (email: string) => {
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
    mutationFn: ({
      userId,
      role,
    }: {
      userId: string;
      role: "company_admin" | "regular";
    }) => updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companyMembers"] });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      toggleUserActiveStatus(userId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companyMembers"] });
    },
  });

  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      `${member.full_name ?? ""} ${member.email ?? ""}`.toLowerCase().includes(searchTerm.trim().toLowerCase());

    const matchesRole = filters.role === "all" || member.role === filters.role;

    const matchesStatus =
      filters.status === "all" ||
      (filters.status === "active" && member.is_active) ||
      (filters.status === "inactive" && !member.is_active);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleUpdateRole = (member: UserProfile, role: "company_admin" | "regular") => {
    updateRoleMutation.mutate({ userId: member.id, role });
  };

  const handleToggleStatus = (member: UserProfile) => {
    toggleStatusMutation.mutate({ userId: member.id, isActive: !member.is_active });
  };

  return (
    <div className="mx-auto w-full space-y-6 pb-10">
      <UserManagementPageHeader
        onInviteClick={() => setIsInviteModalOpen(true)}
      />

      <UserManagementToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={filters}
        onFiltersChange={setFilters}
        isFilterPopoverOpen={isFilterPopoverOpen}
        onFilterPopoverToggle={() => setIsFilterPopoverOpen((open) => !open)}
        onFiltersReset={() => setFilters({ role: "all", status: "all" })}
        exportDisabled={isLoading || isError || filteredMembers.length === 0}
        onExport={() => downloadCsv("team-members.csv", [
          [t("users.member"), t("users.emailAddress"), t("users.role"), t("users.status")],
          ...filteredMembers.map(member => [member.full_name, member.email, getRoleLabel(member.role), t(member.is_active ? "users.active" : "users.inactive")]),
        ])}
      />

      {isError ? <LoadError onRetry={() => { void refetch(); }} retrying={isFetching} /> : null}

      <UserTable
        members={filteredMembers}
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
