import React from "react";
import { UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";

interface UserManagementPageHeaderProps {
  onInviteClick: () => void;
}

export const UserManagementPageHeader: React.FC<UserManagementPageHeaderProps> = ({
  onInviteClick,
}) => {
  const { t } = useTranslation();

  return (
    <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-2xl font-bold text-[#191c1d]">
          {t("users.title")}
        </h1>
        <p className="text-sm text-[#5e5e62] mt-1">{t("users.subtitle")}</p>
      </div>

      <button
        type="button"
        onClick={onInviteClick}
        style={{ backgroundColor: "#ABDB11" }}
        className="hover:opacity-90 text-[#151f00] flex items-center gap-2 px-6 py-3 rounded-full font-bold transition shadow-sm active:scale-95 text-sm"
      >
        <UserPlus className="w-5 h-5" />
        {t("users.inviteNewUser")}
      </button>
    </header>
  );
};
