import React, { useState } from "react";
import { Modal } from "../shared/Modal";
import { Button } from "../shared/Button";
import { Input } from "../shared/Input";
import { Select } from "../shared/Select";
import { useTranslation } from "react-i18next";
import type { User as SBUser } from "@supabase/supabase-js";

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    email: string;
    full_name: string;
    role: "company_admin" | "regular";
  }) => Promise<SBUser | null>;
  isLoading: boolean;
}

export const InviteUserModal: React.FC<InviteUserModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"company_admin" | "regular">("regular");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await onSubmit({ email, full_name: fullName, role });
      setEmail("");
      setFullName("");
      setRole("regular");
      onClose();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : t("users.failedCreateUser"),
      );
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={t("users.inviteNewTeamMember")}
      className="max-w-lg w-full"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2 p-4">
        {errorMsg && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200">
            {errorMsg}
          </div>
        )}

        <Input
          id="invite-user-full-name"
          type="text"
          label={t("users.fullName")}
          placeholder={t("users.placeholderFullName")}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />

        <Input
          id="invite-user-email"
          type="email"
          label={t("users.emailAddress")}
          placeholder={t("users.placeholderEmail")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Select
          id="invite-user-role"
          label={t("users.accessRole")}
          value={role}
          onChange={(e) =>
            setRole(e.target.value as "company_admin" | "regular")
          }
        >
          <option value="regular">{t("users.regularUser")}</option>
          <option value="company_admin">{t("users.companyAdmin")}</option>
        </Select>

        <div className="flex gap-3 border-t border-border-strong pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? t("users.creating") : t("users.inviteUser")}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
