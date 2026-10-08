import React, { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/useAuth";
import { updateTimesheetTimerVisibility } from "../../services/userManagementService";
import { cn } from "../../utils/cn";
import { Card, CardContent, CardHeader, CardTitle } from "../shared/Card";

export const TimesheetTimerVisibilityCard: React.FC = () => {
  const { t } = useTranslation();
  const { profile, refreshProfile } = useAuth();
  const [showTimer, setShowTimer] = useState(
    profile?.show_timesheet_timer ?? false,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setShowTimer(profile?.show_timesheet_timer ?? false);
  }, [profile?.show_timesheet_timer]);

  const handleToggle = async () => {
    if (!profile?.id || isSaving) return;

    const nextValue = !showTimer;
    setShowTimer(nextValue);

    try {
      setIsSaving(true);
      await updateTimesheetTimerVisibility(profile.id, nextValue);
      await refreshProfile();
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (error) {
      setShowTimer(!nextValue);
      alert(
        error instanceof Error
          ? error.message
          : t("userSettings.timerVisibilitySaveFailed"),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="space-y-6 p-6 shadow-sm">
      <CardHeader className="rounded-t-2xl border-b-0 bg-transparent px-0 py-0">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-bg-accent p-2.5 text-primary-strong">
            <Clock3 className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold text-text">
              {t("userSettings.timerVisibilityCardTitle")}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-strong">
              {t("userSettings.timerVisibilityCardSubtitle")}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-0 pb-0">
        <div className="max-w-xl space-y-4">
          <button
            type="button"
            role="switch"
            aria-checked={showTimer}
            aria-label={t("userSettings.timerVisibilityToggleLabel")}
            onClick={handleToggle}
            disabled={isSaving}
            className={cn(
              "inline-flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-70",
              showTimer
                ? "border-primary-strong bg-primary/10"
                : "border-border-strong bg-bg-accent",
            )}
          >
            <span
              className={cn(
                "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors",
                showTimer
                  ? "border-primary-strong bg-primary-strong"
                  : "border-border-strong bg-surface-strong",
              )}
            >
              <span
                className={cn(
                  "inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform",
                  showTimer ? "translate-x-6" : "translate-x-1",
                )}
              />
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-semibold text-text">
                {t("userSettings.timerVisibilityToggleLabel")}
              </span>
              <span className="text-xs text-muted-strong">
                {showTimer
                  ? t("userSettings.timerVisibilityOn")
                  : t("userSettings.timerVisibilityOff")}
              </span>
            </span>
          </button>

          {saved ? (
            <p className="text-xs font-medium text-primary-strong">
              {t("userSettings.timerVisibilitySaved")}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};