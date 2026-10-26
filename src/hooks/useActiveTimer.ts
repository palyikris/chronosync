import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/useAuth";
import {
  getActiveTimerState,
  startTimer,
  stopTimer,
  TIMESHEET_REFRESH_EVENT,
} from "../services/timesheetService";
import type { ActiveTimerState } from "../types/timesheet";

const formatElapsedTime = (elapsedMs: number) => {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  return [
    Math.floor(totalSeconds / 3600),
    Math.floor((totalSeconds % 3600) / 60),
    totalSeconds % 60,
  ]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
};

// Owned by AppLayout so navigation never interrupts the running timer or a save.
export const useActiveTimer = () => {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTimer, setActiveTimer] = useState<ActiveTimerState | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [isHydratingTimer, setIsHydratingTimer] = useState(true);
  const [isSavingTimer, setIsSavingTimer] = useState(false);
  const timerActionPending = useRef(false);

  useEffect(() => {
    let isMounted = true;
    const refreshTimer = async () => {
      try {
        const persistedTimer = profile?.id ? await getActiveTimerState() : null;
        if (isMounted) {
          setActiveTimer(persistedTimer);
          setNow(Date.now());
        }
      } catch (error) {
        console.error("Failed to load active timer", error);
      } finally {
        if (isMounted) setIsHydratingTimer(false);
      }
    };
    const handleStorage = (event: StorageEvent) => {
      const isTimerKey = event.key === `chronosync:active-timer:${profile?.id}`;
      if (event.key === null || (isTimerKey && event.newValue === null)) {
        // Clearing storage can remove the auth session too; no read is needed.
        setActiveTimer(null);
      } else if (isTimerKey) {
        void refreshTimer();
      }
    };

    void refreshTimer();
    window.addEventListener("storage", handleStorage);
    return () => {
      isMounted = false;
      window.removeEventListener("storage", handleStorage);
    };
  }, [profile?.id]);

  useEffect(() => {
    if (!activeTimer) return;
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [activeTimer]);

  const startActiveTimer = async (data: ActiveTimerState) => {
    if (timerActionPending.current || isHydratingTimer || !profile?.company_id) {
      return null;
    }
    timerActionPending.current = true;
    setIsSavingTimer(true);
    try {
      const storedTimer = await startTimer(data);
      setActiveTimer(storedTimer);
      setNow(Date.now());
      return storedTimer;
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : t("timesheet.timerStartFailed"),
      );
      return null;
    } finally {
      timerActionPending.current = false;
      setIsSavingTimer(false);
    }
  };

  const stopActiveTimer = async () => {
    if (!activeTimer || timerActionPending.current) return;
    timerActionPending.current = true;
    setIsSavingTimer(true);
    try {
      await stopTimer(activeTimer);
      setActiveTimer(null);
      setNow(Date.now());
      // A refresh failure must not leave a successfully saved timer running.
      void queryClient.invalidateQueries({ queryKey: ["timesheets"] });
      window.dispatchEvent(new Event(TIMESHEET_REFRESH_EVENT));
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : t("timesheet.timerStopFailed"),
      );
    } finally {
      timerActionPending.current = false;
      setIsSavingTimer(false);
    }
  };

  return {
    activeTimer,
    timerDisplay: formatElapsedTime(
      activeTimer ? now - Date.parse(activeTimer.started_at) : 0,
    ),
    isHydratingTimer,
    isSavingTimer,
    startActiveTimer,
    stopActiveTimer,
  };
};

export type ActiveTimerController = ReturnType<typeof useActiveTimer>;
