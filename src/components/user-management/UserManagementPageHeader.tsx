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
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-text sm:text-[28px]">{t("users.title")}</h1>
        <p className="mt-1.5 text-sm text-muted">{t("users.subtitle")}</p>
      </div>

      <Button
        type="button"
        onClick={onInviteClick}
        icon={<UserPlus />}
      >
        {t("users.inviteNewUser")}
      </Button>
    </header>
  );
};
