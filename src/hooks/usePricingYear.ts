import { useEffect, useState } from "react";

export function getPricingYear(date = new Date()): number {
  return Number(new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Europe/Budapest" }).format(date));
}

/** Keep long-open settings pages in the same business year as database rollover. */
export function usePricingYear(): number {
  const [year, setYear] = useState(getPricingYear);
  useEffect(() => {
    const update = () => setYear(getPricingYear());
    const timer = window.setInterval(update, 1000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return year;
}
