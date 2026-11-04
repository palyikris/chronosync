// Keep this list aligned with SUPPORTED_CURRENCIES in the invoice API contract.
export const PROJECT_PRICING_CURRENCIES = [
  "HUF", "EUR", "CHF", "USD", "AED", "ALL", "AUD", "BAM", "BGN", "BRL",
  "CAD", "CNY", "CZK", "DKK", "EEK", "GBP", "HKD", "HRK", "IDR", "ILS",
  "INR", "ISK", "JPY", "KRW", "KWD", "KSH", "KZT", "LTL", "LVL", "MXN",
  "MYR", "NOK", "NZD", "PHP", "PLN", "RON", "RSD", "RUB", "SEK", "SGD",
  "THB", "TRY", "TWD", "UAH", "VND", "ZAR",
] as const;

export const PROJECT_PRICING_UNITS = [
  { value: "óra", label: "hour", aliases: ["óra", "hour", "hours", "h", "hr"] },
  { value: "hó", label: "month", aliases: ["hó", "hónap", "month"] },
  { value: "fő", label: "person", aliases: ["fő"] },
  { value: "/fő/hó", label: "personMonth", aliases: ["/fő/hó", "fő/hó"] },
  { value: "db", label: "item", aliases: ["db", "/db"] },
  { value: "fix", label: "fixed", aliases: ["fix"] },
  { value: "bevallás", label: "taxReturn", aliases: ["bevallás", "/bevallás"] },
  { value: "2 havonta", label: "twoMonths", aliases: ["2 havonta"] },
] as const;

export function getProjectPricingUnitOption(value: string) {
  const normalized = value.trim().toLowerCase();
  return PROJECT_PRICING_UNITS.find(option => option.aliases.some(alias => alias === normalized));
}
