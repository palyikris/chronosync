import React, { useState, useEffect } from "react";
import { Clock3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/useAuth";
import { updateWeeklyWorkHours } from "../../services/userManagementService";
import { Card, CardContent, CardHeader, CardTitle } from "../shared/Card";
import { Input } from "../shared/Input";
import { Button } from "../shared/Button";

export const WorkHoursCard: React.FC = () => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [weeklyHours, setWeeklyHours] = useState<number>(profile?.weekly_work_hours ?? 40);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile?.weekly_work_hours != null) {
      setWeeklyHours(profile.weekly_work_hours);
    }
  }, [profile?.weekly_work_hours]);

  const handleSave = async () => {
    if (!profile?.id) return;

    try {
      setIsSaving(true);
      await updateWeeklyWorkHours(profile.id, weeklyHours);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : t("userSettings.workHoursSaveFailed"),
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
              {t("userSettings.workHoursCardTitle")}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-strong">
              {t("userSettings.workHoursCardSubtitle")}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-0 pb-0">
        <div className="max-w-xs space-y-4">
          <Input
            type="number"
            min={1}
            max={80}
            step={0.5}
            label={t("userSettings.workHoursLabel")}
            value={weeklyHours}
            onChange={(event) => setWeeklyHours(Number(event.target.value || 0))}
          />

          <Button type="button" onClick={handleSave} disabled={isSaving} variant="primary">
            {isSaving ? t("common.saving") : t("userSettings.saveWorkHours")}
          </Button>

          {saved ? (
            <p className="text-xs font-medium text-primary-strong">
              {t("userSettings.workHoursSaved")}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};
