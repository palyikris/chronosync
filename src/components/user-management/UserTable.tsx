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
import type { UserProfile } from "../../types/auth";

interface UserTableProps {
  members: UserProfile[];
  isLoading: boolean;
  sendingResetEmail: string | null;
  onSendPasswordReset: (email: string) => void;
  onToggleStatus: (member: UserProfile) => void;
  onDeleteUser: (member: UserProfile) => void;
  onUpdateRole: (member: UserProfile, role: "company_admin" | "regular") => void;
}

export const UserTable: React.FC<UserTableProps> = ({
  members,
  isLoading,
  sendingResetEmail,
  onSendPasswordReset,
  onToggleStatus,
  onDeleteUser,
  onUpdateRole,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-[#C4C7C5] shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#f3f4f5] border-b border-[#C4C7C5] text-xs font-semibold text-[#191c1d]">
            <tr>
              <th className="px-6 py-4">Member</th>
              <th className="px-6 py-4">Role Segment</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-gray-400">
                  Loading team members...
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-gray-400">
                  No team members found.
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr
                  key={member.id}
                  className={`hover:bg-[#f8f9fa] transition ${
                    !member.is_active ? "opacity-50 bg-gray-50" : ""
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#4e6700] text-white flex items-center justify-center font-bold text-sm shrink-0">
                        {member.full_name?.charAt(0) || "U"}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-[#191c1d]">
                          {member.full_name}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    {member.role === "super_admin" ? (
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-bold uppercase tracking-wider">
                        Super Admin
                      </span>
                    ) : (
                      <div className="inline-flex border border-[#C4C7C5] rounded-full overflow-hidden bg-white">
                        <button
                          type="button"
                          onClick={() => onUpdateRole(member, "company_admin")}
                          className={`px-3 py-1 text-xs font-semibold flex items-center gap-1 transition ${
                            member.role === "company_admin"
                              ? "bg-[#abdb11] text-[#151f00] font-bold"
                              : "text-[#5e5e62] hover:bg-gray-100"
                          }`}
                        >
                          {member.role === "company_admin" && (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          ADMIN
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateRole(member, "regular")}
                          className={`px-3 py-1 text-xs font-semibold flex items-center gap-1 transition border-l border-[#C4C7C5] ${
                            member.role === "regular"
                              ? "bg-[#abdb11] text-[#151f00] font-bold"
                              : "text-[#5e5e62] hover:bg-gray-100"
                          }`}
                        >
                          {member.role === "regular" && (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          REGULAR
                        </button>
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          member.is_active ? "bg-[#4e6700]" : "bg-gray-400"
                        }`}
                      />
                      <span className="text-sm font-medium">
                        {member.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4 relative text-center">
                    <div className="flex justify-center items-center gap-2 text-[#5e5e62]">
                      {member.email && (
                        <button
                          type="button"
                          title={
                            sendingResetEmail === member.email
                              ? "Sending..."
                              : "Send Password Reset Email"
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
                            className={`w-4 h-4 text-[#5e5e62] ${
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
                            ? "Deactivate User"
                            : "Reactivate User"
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
                        title="Permanently Delete User"
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

      <div className="px-6 py-4 flex items-center justify-between bg-[#f3f4f5] border-t border-[#C4C7C5] text-xs text-[#5e5e62]">
        <span>Showing {members.length} members</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-1.5 border border-[#C4C7C5] rounded-lg text-gray-400 cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="px-3 py-1 bg-[#abdb11] text-[#151f00] font-bold rounded-lg"
          >
            1
          </button>
          <button
            type="button"
            className="p-1.5 border border-[#C4C7C5] rounded-lg hover:bg-gray-200 text-[#5e5e62]"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
