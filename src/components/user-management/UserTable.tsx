import React from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Mail,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import { useTranslation } from "react-i18next";
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

  console.log("Rendering UserTable with members:", members);

  return (
    <div className="bg-white rounded-2xl border border-border-strong shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#f3f4f5] border-b border-border-strong text-xs font-semibold text-text">
            <tr>
              <th className="px-6 py-4">{t("users.member")}</th>
              {isSuperAdmin && (
                <th className="px-6 py-4">{t("users.company")}</th>
              )}
              <th className="px-6 py-4">{t("users.roleSegment")}</th>
              <th className="px-6 py-4">{t("users.status")}</th>
              <th className="px-6 py-4 text-center">{t("users.actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-gray-400">
                  {t("users.loadingMembers")}
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-gray-400">
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
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-strong text-white flex items-center justify-center font-bold text-sm shrink-0">
                        {member.full_name?.charAt(0) || "U"}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-text">
                          {member.full_name}
                        </span>
                      </div>
                    </div>
                  </td>

                  {isSuperAdmin && (
                    <td className="px-6 py-4">
                      <span className="text-sm text-text">
                        {member.companies?.name || "-"}
                      </span>
                    </td>
                  )}

                  <td className="px-6 py-4">
                    {member.role === "super_admin" ? (
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-bold uppercase tracking-wider">
                        {t("users.superAdmin")}
                      </span>
                    ) : (
                      <div className="inline-flex border border-border-strong rounded-full overflow-hidden bg-white">
                        <button
                          type="button"
                          onClick={() => onUpdateRole(member, "company_admin")}
                          className={`px-3 py-1 text-xs font-semibold flex items-center gap-1 transition ${
                            member.role === "company_admin"
                              ? "bg-primary text-primary-foreground font-bold"
                              : "text-muted hover:bg-gray-100"
                          }`}
                        >
                          {member.role === "company_admin" && (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          {t("users.admin")}
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateRole(member, "regular")}
                          className={`px-3 py-1 text-xs font-semibold flex items-center gap-1 transition border-l border-border-strong ${
                            member.role === "regular"
                              ? "bg-primary text-primary-foreground font-bold"
                              : "text-muted hover:bg-gray-100"
                          }`}
                        >
                          {member.role === "regular" && (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          {t("users.regular")}
                        </button>
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          member.is_active ? "bg-primary-strong" : "bg-gray-400"
                        }`}
                      />
                      <span className="text-sm font-medium">
                        {member.is_active
                          ? t("users.active")
                          : t("users.inactive")}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4 relative text-center">
                    <div className="flex justify-center items-center gap-2 text-muted">
                      {member.email && (
                        <button
                          type="button"
                          title={
                            sendingResetEmail === member.email
                              ? t("users.sending")
                              : t("users.sendPasswordReset")
                          }
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
                      )}
                      <button
                        type="button"
                        title={
                          member.is_active
                            ? t("users.deactivateUser")
                            : t("users.reactivateUser")
                        }
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
                      <button
                        type="button"
                        title={t("users.permanentlyDeleteUser")}
                        onClick={() => onDeleteUser(member)}
                        className="p-1.5 hover:bg-red-50 rounded-full transition text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-4 flex items-center justify-between bg-[#f3f4f5] border-t border-border-strong text-xs text-muted">
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
