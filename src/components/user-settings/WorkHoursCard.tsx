import React, { useState } from "react";
import { Clock3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/useAuth";
import { updateWeeklyWorkHours } from "../../services/userManagementService";
import { Card, CardContent, CardHeader, CardTitle } from "../shared/Card";
import { Input } from "../shared/Input";
import { Button } from "../shared/Button";

export const WorkHoursCard: React.FC = () => {
  const { t } = useTranslation();
  const { profile, refreshProfile } = useAuth();
  const [draftHours, setWeeklyHours] = useState<number | "" | null>(null);
  const weeklyHours = draftHours ?? profile?.weekly_work_hours ?? 40;
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!profile?.id || isSaving || weeklyHours === "") return;

    try {
      setIsSaving(true);
      await updateWeeklyWorkHours(profile.id, weeklyHours);
      await refreshProfile();
      setWeeklyHours(null);
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
    <Card className="space-y-5 p-5">
      <CardHeader className="rounded-t-2xl border-b-0 bg-transparent px-0 py-0">
        <div className="flex items-center gap-3">
          <div className="rounded-[10px] bg-primary/10 p-2 text-primary-strong">
            <Clock3 className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-[15px] font-semibold text-text">
              {t("userSettings.workHoursCardTitle")}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-strong">
              {t("userSettings.workHoursCardSubtitle")}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-0 pb-0">
        <form className="max-w-xs space-y-4" onSubmit={event => { event.preventDefault(); void handleSave(); }}>
          <Input
            type="number"
            required
            min={1}
            max={80}
            step={0.5}
            label={t("userSettings.workHoursLabel")}
            value={weeklyHours}
            onChange={(event) => { setWeeklyHours(event.target.value === "" ? "" : event.target.valueAsNumber); setSaved(false); }}
          />

          <Button type="submit" disabled={isSaving} variant="primary">
            {isSaving ? t("common.saving") : t("userSettings.saveWorkHours")}
          </Button>

          {saved ? (
            <p className="motion-pop text-xs font-medium text-primary-strong">
              {t("userSettings.workHoursSaved")}
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
};
