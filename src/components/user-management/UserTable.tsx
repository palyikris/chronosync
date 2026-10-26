import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Mail,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Tooltip } from "../shared/Tooltip";
import type { UserProfile } from "../../types/auth";

interface UserTableProps {
  members: UserProfile[];
  isLoading: boolean;
  sendingResetEmail: string | null;
  onSendPasswordReset: (email: string) => void;
  onToggleStatus: (member: UserProfile) => void;
  onDeleteUser: (member: UserProfile) => void;
  onUpdateRole: (
    member: UserProfile,
    role: "company_admin" | "regular",
  ) => void;
  isSuperAdmin: boolean;
}

export const UserTable: React.FC<UserTableProps> = ({
  members,
  isLoading,
  sendingResetEmail,
  onSendPasswordReset,
  onToggleStatus,
  onDeleteUser,
  onUpdateRole,
  isSuperAdmin,
}) => {
  const { t } = useTranslation();

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface-strong/84 shadow-card backdrop-blur-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="border-b border-border bg-bg-accent/45 text-[11px] font-medium text-muted-strong">
            <tr>
              <th className="px-4 py-3">{t("users.member")}</th>
              {isSuperAdmin && (
                <th className="px-4 py-3">{t("users.company")}</th>
              )}
              <th className="px-4 py-3">{t("users.roleSegment")}</th>
              <th className="px-4 py-3">{t("users.status")}</th>
              <th className="px-4 py-3 text-center">{t("users.actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {isLoading ? (
              <tr>
                <td colSpan={isSuperAdmin ? 5 : 4} className="text-center py-8 text-gray-400">
                  {t("users.loadingMembers")}
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={isSuperAdmin ? 5 : 4} className="text-center py-8 text-gray-400">
                  {t("users.noMembers")}
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr
                  key={member.id}
                  className={`hover:bg-bg transition ${
                    !member.is_active ? "opacity-50 bg-gray-50" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/35 text-[11px] font-semibold text-text shadow-[inset_0_0_0_1px_rgba(75,87,57,0.07)]">
                        {member.full_name?.charAt(0) || "U"}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[13px] font-medium text-text">
                          {member.full_name}
                        </span>
                      </div>
                    </div>
                  </td>

                  {isSuperAdmin && (
                    <td className="px-4 py-3">
                      <span className="text-sm text-text">
                        {member.companies?.name || "-"}
                      </span>
                    </td>
                  )}

                  <td className="px-4 py-3">
                    {member.role === "super_admin" ? (
                      <span className="rounded-full bg-purple-100 px-2.5 py-1 text-[11px] font-medium text-purple-800">
                        {t("users.superAdmin")}
                      </span>
                    ) : (
                      <div
                        role="group"
                        aria-label={t("users.role")}
                        className="inline-grid min-w-36 grid-cols-2 rounded-[9px] border border-border bg-bg/70 p-0.5 shadow-[inset_0_1px_2px_rgba(75,87,57,0.05)]"
                      >
                        <button
                          type="button"
                          onClick={() => onUpdateRole(member, "company_admin")}
                          aria-pressed={member.role === "company_admin"}
                          className={`flex h-7 items-center justify-center rounded-[7px] px-2 text-[10px] font-semibold tracking-[0.045em] transition-[color,background-color,box-shadow] duration-150 ${
                            member.role === "company_admin"
                              ? "bg-primary/75 text-primary-foreground shadow-[0_1px_2px_rgba(75,87,57,0.13),inset_0_0_0_1px_rgba(96,120,42,0.08)]"
                              : "text-muted hover:bg-white/65 hover:text-text"
                          }`}
                        >
                          {t("users.admin")}
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateRole(member, "regular")}
                          aria-pressed={member.role === "regular"}
                          className={`flex h-7 items-center justify-center rounded-[7px] px-2 text-[10px] font-semibold tracking-[0.045em] transition-[color,background-color,box-shadow] duration-150 ${
                            member.role === "regular"
                              ? "bg-primary/75 text-primary-foreground shadow-[0_1px_2px_rgba(75,87,57,0.13),inset_0_0_0_1px_rgba(96,120,42,0.08)]"
                              : "text-muted hover:bg-white/65 hover:text-text"
                          }`}
                        >
                          {t("users.regular")}
                        </button>
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          member.is_active ? "bg-primary-strong" : "bg-gray-400"
                        }`}
                      />
                      <span className="text-[12px] font-medium">
                        {member.is_active
                          ? t("users.active")
                          : t("users.inactive")}
                      </span>
                    </div>
                  </td>

                  <td className="relative px-4 py-3 text-center">
                    <div className="flex justify-center items-center gap-2 text-muted">
                      {member.email && (
                        <Tooltip
                          content={
                            sendingResetEmail === member.email
                              ? t("users.sending")
                              : t("users.sendPasswordReset")
                          }
                        >
                          <button
                            type="button"
                            onClick={() => onSendPasswordReset(member.email)}
                            disabled={sendingResetEmail === member.email}
                            className={`p-1.5 rounded-full transition ${
                              sendingResetEmail === member.email
                                ? "bg-gray-100"
                                : "hover:bg-gray-100"
                            }`}
                          >
                            <Mail
                              className={`w-4 h-4 text-muted ${
                                sendingResetEmail === member.email
                                  ? "opacity-60"
                                  : ""
                              }`}
                            />
                          </button>
                        </Tooltip>
                      )}
                      <Tooltip
                        content={
                          member.is_active
                            ? t("users.deactivateUser")
                            : t("users.reactivateUser")
                        }
                      >
                        <button
                          type="button"
                          onClick={() => onToggleStatus(member)}
                          className={`p-1.5 rounded-full transition ${
                            member.is_active
                              ? "hover:bg-red-50 text-red-600"
                              : "hover:bg-green-50 text-green-600"
                          }`}
                        >
                          {member.is_active ? (
                            <UserX className="w-4 h-4" />
                          ) : (
                            <UserCheck className="w-4 h-4" />
                          )}
                        </button>
                      </Tooltip>
                      <Tooltip content={t("users.permanentlyDeleteUser")}>
                        <button
                          type="button"
                          onClick={() => onDeleteUser(member)}
                          className="p-1.5 hover:bg-red-50 rounded-full transition text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-border bg-bg-accent/40 px-4 py-3 text-[11px] text-muted">
        <span>{t("users.showingMembers", { count: members.length })}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-1.5 border border-border-strong rounded-lg text-gray-400 cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="px-3 py-1 bg-primary text-primary-foreground font-bold rounded-lg"
          >
            1
          </button>
          <button
            type="button"
            className="p-1.5 border border-border-strong rounded-lg hover:bg-gray-200 text-muted"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
