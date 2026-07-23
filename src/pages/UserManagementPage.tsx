import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
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

export const UserManagementPage: React.FC = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [sendingResetEmail, setSendingResetEmail] = useState<string | null>(null);

  const [filters, setFilters] = useState<UserFilterState>({
    role: "all",
    status: "all",
  });
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["companyMembers"],
    queryFn: fetchCompanyMembers,
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
    if (
      window.confirm(
        `Are you sure you want to PERMANENTLY delete ${fullName}? This will erase their account and timesheets permanently.`,
      )
    ) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleSendPasswordReset = async (email: string) => {
    try {
      setSendingResetEmail(email);
      await sendUserPasswordReset(email);
      alert("Password reset email sent.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send reset email.";
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
    const matchesSearch = member.full_name
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase()) ?? false;

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
    <div className="max-w-6xl mx-auto space-y-6">
      <UserManagementPageHeader onInviteClick={() => setIsInviteModalOpen(true)} />

      <UserManagementToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={filters}
        onFiltersChange={setFilters}
        isFilterPopoverOpen={isFilterPopoverOpen}
        onFilterPopoverToggle={() => setIsFilterPopoverOpen((open) => !open)}
        onFiltersReset={() => setFilters({ role: "all", status: "all" })}
      />

      <UserTable
        members={filteredMembers}
        isLoading={isLoading}
        sendingResetEmail={sendingResetEmail}
        onSendPasswordReset={handleSendPasswordReset}
        onToggleStatus={handleToggleStatus}
        onDeleteUser={(member) => handleDeleteUser(member.id, member.full_name)}
        onUpdateRole={handleUpdateRole}
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
