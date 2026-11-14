export const BILLING_EMAIL_MAX_LENGTH = 255;

export function isBillingEmail(value: string): boolean {
  return value.length <= BILLING_EMAIL_MAX_LENGTH &&
    /^[^\s<>@,;:"()\\]+@[^\s<>@,;:"()\\]+\.[^\s<>@,;:"()\\]+$/.test(value);
}

export function splitBillingEmails(value: string | null | undefined): string[] {
  return (value ?? "").split(/[,;\r\n]/).map(email => email.trim()).filter(Boolean);
}

export function uniqueBillingEmails(emails: string[]): string[] {
  const seen = new Set<string>();
  return emails.filter(email => {
    const key = email.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
