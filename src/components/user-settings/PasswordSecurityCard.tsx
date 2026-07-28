import React, { useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../lib/supabaseClient";
import { updatePasswordSchema } from "../../lib/zodSchemas";
import { Button } from "../shared/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../shared/Card";
import { Input } from "../shared/Input";

const translateValidationMessage = (
  message: string,
  translate: (key: string) => string,
) => {
  return message.startsWith("validation.") ? translate(message) : message;
};

export const PasswordSecurityCard: React.FC = () => {
  const { t } = useTranslation();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    const validation = updatePasswordSchema.safeParse({
      newPassword,
      confirmPassword,
    });

    if (!validation.success) {
      const message = validation.error.issues[0]?.message ?? "validation.invalidInput";
      setPasswordError(translateValidationMessage(message, t));
      return;
    }

    setIsSubmittingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setPasswordSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setPasswordError(
        err instanceof Error ? err.message : t("userSettings.passwordUpdateFailed"),
      );
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  return (
    <Card className="space-y-6 p-6 shadow-sm">
      <CardHeader className="rounded-t-2xl border-b-0 bg-transparent px-0 py-0">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-bg-accent p-2.5 text-primary-strong">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold text-text">
              {t("userSettings.passwordCardTitle")}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-strong">
              {t("userSettings.passwordCardSubtitle")}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-0 pb-0">
        <form onSubmit={handlePasswordSubmit} className="max-w-md space-y-4">
          {passwordError ? (
            <div className="rounded-xl border border-danger/20 bg-danger/10 p-3 text-xs font-medium text-danger">
              {passwordError}
            </div>
          ) : null}

          {passwordSuccess ? (
            <div className="rounded-xl border border-primary-strong/20 bg-primary/10 p-3 text-xs font-medium text-primary-strong">
              {t("userSettings.passwordUpdated")}
            </div>
          ) : null}

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-text">
              {t("userSettings.newPasswordLabel")}
            </label>
            <Input
              type="password"
              value={newPassword}
              onChange={(event) => {
                setNewPassword(event.target.value);
                if (passwordError) setPasswordError(null);
                if (passwordSuccess) setPasswordSuccess(false);
              }}
              placeholder={t("userSettings.passwordPlaceholder")}
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-text">
              {t("userSettings.confirmPasswordLabel")}
            </label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                if (passwordError) setPasswordError(null);
                if (passwordSuccess) setPasswordSuccess(false);
              }}
              placeholder={t("userSettings.passwordPlaceholder")}
              autoComplete="new-password"
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmittingPassword}
            className="rounded-xl px-5"
            icon={<KeyRound className="h-4 w-4" />}
          >
            {isSubmittingPassword
              ? t("userSettings.updatingPassword")
              : t("userSettings.updatePassword")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};