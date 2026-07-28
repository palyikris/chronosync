import React from "react";
import { UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../shared/Button";

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
        <h1 className="text-2xl font-bold text-text">{t("users.title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("users.subtitle")}</p>
      </div>

      <Button
        type="button"
        onClick={onInviteClick}
        className="px-6 py-3 text-sm"
        icon={<UserPlus className="h-5 w-5" />}
      >
        {t("users.inviteNewUser")}
      </Button>
    </header>
  );
};
