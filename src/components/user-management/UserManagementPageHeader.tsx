import React from "react";
import { UserPlus } from "lucide-react";

interface UserManagementPageHeaderProps {
  onInviteClick: () => void;
}

export const UserManagementPageHeader: React.FC<UserManagementPageHeaderProps> = ({
  onInviteClick,
}) => {
  return (
    <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-2xl font-bold text-[#191c1d]">Team Members</h1>
        <p className="text-sm text-[#5e5e62] mt-1">
          Manage access levels and monitor team activity.
        </p>
      </div>

      <button
        type="button"
        onClick={onInviteClick}
        style={{ backgroundColor: "#ABDB11" }}
        className="hover:opacity-90 text-[#151f00] flex items-center gap-2 px-6 py-3 rounded-full font-bold transition shadow-sm active:scale-95 text-sm"
      >
        <UserPlus className="w-5 h-5" />
        Invite New User
      </button>
    </header>
  );
};
