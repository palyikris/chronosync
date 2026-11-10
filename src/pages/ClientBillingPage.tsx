import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Download,
  Eye,
  ReceiptText,
  Search,
  Settings2,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "../components/shared/Button";
import { Card } from "../components/shared/Card";
import { Checkbox } from "../components/shared/Checkbox";
import { InvoiceHistoryCard } from "../components/client-billing/InvoiceHistoryCard";
import { ProjectInvoicePricing } from "../components/client-billing/ProjectInvoicePricing";
import { InvoiceDateFields } from "../components/client-billing/InvoiceDateFields";
import { InvoiceTermsFields } from "../components/client-billing/InvoiceTermsFields";
import { InvoiceReviewModal } from "../components/client-billing/InvoiceReviewModal";
import { PartnerBillingImportModal } from "../components/client-billing/PartnerBillingImportModal";
import { Input } from "../components/shared/Input";
import { InfoPopover } from "../components/shared/InfoPopover";
import { Select } from "../components/shared/Select";
import { useAuth } from "../context/useAuth";
import {
  downloadClientInvoicePreview,
  downloadIssuedInvoicePdf,
  fetchClientBillingProfiles,
  fetchInvoiceHistory,
  issueClientInvoice,
  reconcileInvoice,
  submitInvoiceStorno,
  downloadStornoPdf,
  downloadReviewedInvoiceAttachment,
  downloadStoredInvoiceAttachment,
  reviewClientInvoice,
  saveClientBillingProfile,
} from "../services/clientBillingService";
import { fetchClients } from "../services/clientProjectService";
import { companyService } from "../services/companyService";
import type {
  BillingProfileField,
  ClientInvoiceReview,
  ClientBillingProfile,
  ClientBillingProfileUpsert,
  InvoiceHistoryItem,
  InvoiceHistoryScope,
  TaxSubject,
  InvoiceDateOverrides,
} from "../types/client-billing";
import type { Client } from "../types/client-project";
import { getBillingProfileReadiness } from "../utils/clientBillingReadiness";
import { cn } from "../utils/cn";
import { isDemoDocument } from "../lib/serviceEnvironment";

const VAT_CODES = [
  "27",
  "18",
  "5",
  "0",
  "AAM",
  "TAM",
  "TAHK",
  "ATK",
  "F.AFA",
  "EUT",
  "EUKT",
  "EUE",
  "EUFAD37",
  "EUFADE",
  "HO",
  "NAM",
  "EAM",
] as const;

const LANGUAGE_CODES = [
  "hu",
  "en",
  "de",
  "it",
  "ro",
  "sk",
  "hr",
  "fr",
  "es",
  "cz",
  "pl",
  "bg",
  "nl",
  "ru",
  "si",
] as const;

const toDateInputValue = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getPreviousCalendarMonth = () => {
  const today = new Date();
  return {
    start: toDateInputValue(
      new Date(today.getFullYear(), today.getMonth() - 1, 1),
    ),
    end: toDateInputValue(new Date(today.getFullYear(), today.getMonth(), 0)),
  };
};

const PREVIEW_COMPANY_ID = "00000000-0000-4000-8000-000000000001";
const PREVIEW_CLIENTS: Client[] = [
  {
    id: "00000000-0000-4000-8000-000000000011",
    company_id: PREVIEW_COMPANY_ID,
    name: "Northstar Studio Kft.",
    client_code: "NST",
    is_active: true,
    is_default: true,
    invoice_attachment_language: "hu",
    available_hours_per_month: 80,
    hours_from_previous_month: 0,
  },
  {
    id: "00000000-0000-4000-8000-000000000012",
    company_id: PREVIEW_COMPANY_ID,
    name: "Lumen Works GmbH",
    client_code: "LUM",
    is_active: true,
    is_default: false,
    invoice_attachment_language: "en",
    available_hours_per_month: 40,
    hours_from_previous_month: 0,
  },
  {
    id: "00000000-0000-4000-8000-000000000013",
    company_id: PREVIEW_COMPANY_ID,
    name: "Minta Partner Zrt.",
    client_code: "MPT",
    is_active: true,
    is_default: false,
    invoice_attachment_language: "hu",
    available_hours_per_month: 60,
    hours_from_previous_month: 0,
  },
];

const createProfileDraft = (
  client: Client,
  profile?: ClientBillingProfile,
): ClientBillingProfileUpsert =>
  profile
    ? {
        client_id: profile.client_id,
        company_id: profile.company_id,
        billing_name: profile.billing_name,
        billing_country_code: profile.billing_country_code,
        billing_postal_code: profile.billing_postal_code,
        billing_city: profile.billing_city,
        billing_address: profile.billing_address,
        tax_subject: profile.tax_subject,
        tax_number: profile.tax_number,
        eu_vat_number: profile.eu_vat_number,
        group_tax_number: profile.group_tax_number,
        billing_email: profile.billing_email,
        send_invoice_email: profile.send_invoice_email,
        invoice_language: profile.invoice_language,
        payment_method: profile.payment_method,
        payment_term_days: profile.payment_term_days,
        payment_due_policy: profile.payment_due_policy ?? "days_after_issue",
        payment_due_reference: profile.payment_due_reference ?? "issue_date",
        payment_due_month_offset: profile.payment_due_month_offset ?? 1,
        invoice_note: profile.invoice_note ?? null,
        invoice_electronic: profile.invoice_electronic ?? false,
        fulfillment_date_policy: profile.fulfillment_date_policy ?? "period_end",
        invoice_prefix: profile.invoice_prefix ?? null,
        seller_bank_name: profile.seller_bank_name ?? null,
        seller_bank_account: profile.seller_bank_account ?? null,
        vat_code: profile.vat_code,
        automatic_invoicing_enabled:
          profile.automatic_invoicing_enabled,
        invoice_schedule_day: profile.invoice_schedule_day,
        attach_timesheet_report: true,
      }
    : {
        client_id: client.id,
        company_id: client.company_id,
        billing_name: client.name,
        billing_country_code: "HU",
        billing_postal_code: null,
        billing_city: null,
        billing_address: null,
        tax_subject: null,
        tax_number: null,
        eu_vat_number: null,
        group_tax_number: null,
        billing_email: null,
        send_invoice_email: false,
        invoice_language: client.invoice_attachment_language ?? "hu",
        payment_method: "Átutalás",
        payment_term_days: 8,
        payment_due_policy: "days_after_issue",
        payment_due_reference: "issue_date",
        payment_due_month_offset: 1,
        invoice_note: null,
        invoice_electronic: false,
        fulfillment_date_policy: "period_end",
        invoice_prefix: null,
        seller_bank_name: null,
        seller_bank_account: null,
        vat_code: "27",
        automatic_invoicing_enabled: false,
        invoice_schedule_day: 1,
        attach_timesheet_report: true,
      };

const PREVIEW_PROFILES: ClientBillingProfile[] = [
  {
    ...createProfileDraft(PREVIEW_CLIENTS[0]),
    billing_postal_code: "1024",
    billing_city: "Budapest",
    billing_address: "Fény utca 12.",
    tax_subject: 1,
    tax_number: "12345678-2-41",
    billing_email: "billing@northstar.example",
    send_invoice_email: true,
    automatic_invoicing_enabled: true,
    created_at: "2026-10-22T00:00:00Z",
    updated_at: "2026-10-22T00:00:00Z",
  },
  {
    ...createProfileDraft(PREVIEW_CLIENTS[1]),
    billing_country_code: "DE",
    billing_postal_code: "10115",
    billing_city: "Berlin",
    billing_address: "Invalidenstraße 117",
    tax_subject: 6,
    eu_vat_number: "DE123456789",
    billing_email: "finance@lumen.example",
    invoice_language: "en",
    vat_code: "EUFAD37",
    automatic_invoicing_enabled: false,
    created_at: "2026-10-22T00:00:00Z",
    updated_at: "2026-10-22T00:00:00Z",
  },
  {
    ...createProfileDraft(PREVIEW_CLIENTS[2]),
    created_at: "2026-10-22T00:00:00Z",
    updated_at: "2026-10-22T00:00:00Z",
  },
];

const SectionHeading: React.FC<{
  title: string;
  children: React.ReactNode;
  level?: "h2" | "h3";
}> = ({ title, children, level: Heading = "h3" }) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-1.5">
      <Heading className="text-sm font-semibold text-text">{title}</Heading>
      <InfoPopover label={t("common.infoAbout", { topic: title })}>{children}</InfoPopover>
    </div>
  );
};

const SwitchRow: React.FC<{
  id: string;
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}> = ({ id, title, description, checked, disabled, onChange }) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-1.5">
      <label htmlFor={id} className={cn(
        "flex min-w-0 items-center gap-2.5 text-[13px] text-text",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
      )}>
        <Checkbox id={id} checked={checked} disabled={disabled}
          onChange={(event) => onChange(event.target.checked)} className="shrink-0" />
        <span>{title}</span>
      </label>
      <InfoPopover label={t("common.infoAbout", { topic: title })}>{description}</InfoPopover>
    </div>
  );
};

export const ClientBillingPage: React.FC<{ preview?: boolean; initialPeriod?: { start: string; end: string } }> = ({
  preview = false,
  initialPeriod,
}) => {
  const { t } = useTranslation();
  const { profile: userProfile } = useAuth();
  const queryClient = useQueryClient();
  const companyId = preview
    ? PREVIEW_COMPANY_ID
    : (userProfile?.company_id ?? "");
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, Record<string, string>>>({});
  const [selectedClientId, setSelectedClientId] = useState("");
  const [historyScope, setHistoryScope] = useState<InvoiceHistoryScope>("client");
  const [searchTerm, setSearchTerm] = useState("");
  const [draft, setDraft] = useState<ClientBillingProfileUpsert | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [invoicePeriod, setInvoicePeriod] = useState(initialPeriod ?? getPreviousCalendarMonth);
  const [result, setResult] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const [previewResult, setPreviewResult] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const [invoiceReview, setInvoiceReview] = useState<ClientInvoiceReview | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [manualDates, setManualDates] = useState<InvoiceDateOverrides>({});
  const [partnerImportOpen, setPartnerImportOpen] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null);
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<string | null>(null);
  const [attachmentDownloadError, setAttachmentDownloadError] = useState<string | null>(null);

  const clientsQuery = useQuery<Client[]>({
    queryKey: ["clients", userProfile?.id, companyId],
    queryFn: () => fetchClients(companyId),
    enabled: Boolean(companyId) && !preview,
  });

  const profilesQuery = useQuery<ClientBillingProfile[]>({
    queryKey: ["clientBillingProfiles", companyId],
    queryFn: () => fetchClientBillingProfiles(companyId),
    enabled: Boolean(companyId) && !preview,
  });

  const invoiceSettingsQuery = useQuery({
    queryKey: ["invoice-settings", companyId],
    queryFn: () => companyService.getInvoiceSettings(companyId),
    enabled: Boolean(companyId) && !preview,
    retry: false,
  });

  const companyQuery = useQuery({
    queryKey: ["company", companyId],
    queryFn: () => companyService.fetchCompany(companyId),
    enabled: Boolean(companyId) && !preview,
  });

  const clients = useMemo(
    () => (preview ? PREVIEW_CLIENTS : (clientsQuery.data ?? [])),
    [clientsQuery.data, preview],
  );
  const profiles = useMemo(
    () => (preview ? PREVIEW_PROFILES : (profilesQuery.data ?? [])),
    [preview, profilesQuery.data],
  );
  const profilesByClientId = useMemo(
    () => new Map(profiles.map((billingProfile) => [billingProfile.client_id, billingProfile])),
    [profiles],
  );

  const effectiveSelectedClientId =
    selectedClientId ||
    (clients.find((client) => client.is_active) ?? clients[0])?.id ||
    "";

  const selectedClient = useMemo(
    () =>
      clients.find((client) => client.id === effectiveSelectedClientId) ?? null,
    [clients, effectiveSelectedClientId],
  );

  const historyClientId = historyScope === "client" ? effectiveSelectedClientId : undefined;
  const historyQuery = useQuery<InvoiceHistoryItem[]>({
    queryKey: ["invoice-history", companyId, historyClientId ?? null],
    queryFn: () => fetchInvoiceHistory(companyId, historyClientId),
    enabled: Boolean(companyId) && !preview && (historyScope === "global" || Boolean(historyClientId)),
    retry: false,
    refetchInterval: (query) =>
      query.state.data?.some((item) => item.status === "issuing" || item.reversal?.status === "reversing") ? 15_000 : false,
  });

  const quantityScope = `${companyId}:${effectiveSelectedClientId}:${invoicePeriod.start}:${invoicePeriod.end}`;
  const quantityDraft = quantityDrafts[quantityScope] ?? {};
  const projectQuantities = Object.fromEntries(Object.entries(quantityDraft)
    .filter(([, value]) => value.trim() !== "").map(([key, value]) => [key, Number(value)]));

  const selectedStoredProfile = selectedClient
    ? profilesByClientId.get(selectedClient.id)
    : undefined;

  /* The form is an editable snapshot. It intentionally resets when the selected
     database row changes; deriving it during render would discard user edits. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!selectedClient) {
      setDraft(null);
      return;
    }

    setDraft(createProfileDraft(selectedClient, selectedStoredProfile));
    setManualDates({});
    setIsDirty(false);
    setResult(null);
    setPreviewResult(null);
    setInvoiceReview(null);
    setReviewOpen(false);
    setIssueError(null);
  }, [selectedClient, selectedStoredProfile]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const updateDraft = (
    updater: (current: ClientBillingProfileUpsert) => ClientBillingProfileUpsert,
  ) => {
    setDraft((current) => {
      if (!current) return current;
      const next = updater(current);
      if (
        next.automatic_invoicing_enabled &&
        !getBillingProfileReadiness(next).complete
      ) {
        next.automatic_invoicing_enabled = false;
      }
      return next;
    });
    setIsDirty(true);
    setResult(null);
    setPreviewResult(null);
    setInvoiceReview(null);
    setIssueError(null);
  };

  const saveMutation = useMutation({
    mutationFn: saveClientBillingProfile,
    onSuccess: (savedProfile) => {
      queryClient.setQueryData<ClientBillingProfile[]>(
        ["clientBillingProfiles", companyId],
        (current = []) => {
          const remaining = current.filter(
            (item) => item.client_id !== savedProfile.client_id,
          );
          return [...remaining, savedProfile].sort((left, right) =>
            (left.billing_name ?? "").localeCompare(right.billing_name ?? ""),
          );
        },
      );
      setDraft(createProfileDraft(selectedClient!, savedProfile));
      setIsDirty(false);
      setResult({
        kind: "success",
        message: t("clientBilling.saved"),
      });
    },
    onError: (error) => {
      setResult({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : t("clientBilling.saveFailed"),
      });
    },
  });

  const previewMutation = useMutation({
    mutationFn: downloadClientInvoicePreview,
    onSuccess: () => {
      setPreviewResult({
        kind: "success",
        message: t("clientBilling.previewDownloaded"),
      });
    },
    onError: (error) => {
      setPreviewResult({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : t("clientBilling.previewFailed"),
      });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: reviewClientInvoice,
    onSuccess: (review) => {
      setInvoiceReview(review);
      setManualDates(review.date_overrides ?? {});
      setAttachmentDownloadError(null);
      setIssueError(null);
      setReviewOpen(true);
    },
    onError: (error) => {
      setPreviewResult({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : t("clientBilling.reviewFailed"),
      });
    },
  });

  const issueMutation = useMutation({
    mutationFn: issueClientInvoice,
    onSuccess: (issuedInvoice) => {
      setReviewOpen(false);
      setInvoiceReview(null);
      setIssueError(null);
      setPreviewResult({
        kind: "success",
        message: t("clientBilling.invoiceIssued", {
          invoiceNumber: issuedInvoice.invoice_number,
        }),
      });
      void queryClient.invalidateQueries({ queryKey: ["invoice-history", companyId] });
      setManualDates({});
      void queryClient.invalidateQueries({ queryKey: ["timesheets"] });
    },
    onError: (error) => {
      setIssueError(
        error instanceof Error ? error.message : t("clientBilling.issueFailed"),
      );
      void queryClient.invalidateQueries({ queryKey: ["invoice-history", companyId] });
    },
  });

  const reconcileMutation = useMutation({
    mutationFn: reconcileInvoice,
    onSuccess: () => {
      setPreviewResult({
        kind: "success",
        message: t("clientBilling.reconciliationSaved"),
      });
      void queryClient.invalidateQueries({ queryKey: ["invoice-history", companyId] });
      void queryClient.invalidateQueries({ queryKey: ["timesheets"] });
    },
    onError: (error) => {
      setPreviewResult({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : t("clientBilling.reconciliationFailed"),
      });
    },
  });

  const stornoMutation = useMutation({
    mutationFn: submitInvoiceStorno,
    retry: false,
    onSuccess: () => {
      setInvoiceReview(null);
      setReviewOpen(false);
      setPreviewResult({ kind: "success", message: t("clientBilling.storno.saved") });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["invoice-history", companyId] });
      void queryClient.invalidateQueries({ queryKey: ["timesheets"] });
      void queryClient.invalidateQueries({ queryKey: ["clientBillingProfiles", companyId] });
    },
  });

  const clientRows = useMemo(
    () =>
      clients.map((client) => {
        const billingProfile = profilesByClientId.get(client.id);
        const effectiveProfile = createProfileDraft(client, billingProfile);
        return {
          client,
          profile: effectiveProfile,
          readiness: getBillingProfileReadiness(effectiveProfile),
        };
      }),
    [clients, profilesByClientId],
  );

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredClientRows = clientRows.filter(({ client }) =>
    `${client.name} ${client.client_code}`
      .toLowerCase()
      .includes(normalizedSearch),
  );

  const draftReadiness = draft ? getBillingProfileReadiness(draft) : null;
  const savedProfileReadiness = selectedStoredProfile
    ? getBillingProfileReadiness(selectedStoredProfile)
    : null;
  const selectClient = (clientId: string) => {
    if (
      isDirty &&
      !window.confirm(t("clientBilling.discardChangesConfirmation"))
    ) {
      return;
    }
    setSelectedClientId(clientId);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft || saveMutation.isPending) return;
    saveMutation.mutate(draft);
  };

  const cancelChanges = () => {
    if (!selectedClient || saveMutation.isPending) return;
    setDraft(createProfileDraft(selectedClient, selectedStoredProfile));
    setIsDirty(false);
    setResult(null);
    setPreviewResult(null);
    setInvoiceReview(null);
    setReviewOpen(false);
    setIssueError(null);
    setAttachmentDownloadError(null);
  };

  const integrationConfigured =
    preview ||
    (invoiceSettingsQuery.data?.invoice_provider === "szamlazz_hu" &&
      invoiceSettingsQuery.data.api_key_configured === true);
  const isCompanyPreviewMode =
    preview || (companyQuery.data?.szamlazz_test_mode ?? true);
  const loading = !preview && (clientsQuery.isLoading || profilesQuery.isLoading);
  const loadError = clientsQuery.error || profilesQuery.error;
  const invoicePeriodStartTime = Date.parse(`${invoicePeriod.start}T00:00:00Z`);
  const invoicePeriodEndTime = Date.parse(`${invoicePeriod.end}T00:00:00Z`);
  const invoicePeriodIsValid =
    Number.isFinite(invoicePeriodStartTime) &&
    Number.isFinite(invoicePeriodEndTime) &&
    invoicePeriodEndTime >= invoicePeriodStartTime &&
    invoicePeriodEndTime - invoicePeriodStartTime <= 366 * 86_400_000;
  const canGeneratePreview = Boolean(
    !preview &&
      integrationConfigured &&
      selectedClient?.is_active &&
      savedProfileReadiness?.complete &&
      !isDirty &&
      invoicePeriodIsValid,
  );
  const canReviewInvoice = canGeneratePreview;

  const generatePreview = () => {
    if (!selectedClient || !canGeneratePreview || previewMutation.isPending) return;
    setPreviewResult(null);
    previewMutation.mutate({
      companyId,
      clientId: selectedClient.id,
      clientCode: selectedClient.client_code,
      periodStart: invoicePeriod.start,
      periodEnd: invoicePeriod.end,
      projectQuantities,
      dateOverrides: manualDates,
    });
  };

  const generateReview = () => {
    if (!selectedClient || !canReviewInvoice || reviewMutation.isPending) return;
    setPreviewResult(null);
    setIssueError(null);
    reviewMutation.mutate({
      companyId,
      clientId: selectedClient.id,
      periodStart: invoicePeriod.start,
      periodEnd: invoicePeriod.end,
      projectQuantities,
      dateOverrides: manualDates,
    });
  };

  const downloadInvoicePdf = async (item: InvoiceHistoryItem, storno = false) => {
    setDownloadingInvoiceId(item.id);
    setPreviewResult(null);
    try {
      if (storno) await downloadStornoPdf(companyId, item.id);
      else await downloadIssuedInvoicePdf(companyId, item.id);
      if (!item.pdf_available) await queryClient.invalidateQueries({ queryKey: ["invoice-history", companyId] });
    } catch (error) {
      setPreviewResult({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : t("clientBilling.pdfDownloadFailed"),
      });
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  const resolveNotIssued = (item: InvoiceHistoryItem) => {
    if (!window.confirm(t("clientBilling.resolveNotIssuedConfirmation"))) return;
    reconcileMutation.mutate({
      companyId,
      invoiceId: item.id,
      resolution: "not_issued",
    });
  };

  const downloadInvoiceAttachment = async (item?: InvoiceHistoryItem) => {
    if (!item && !invoiceReview) return;
    if (!item) setAttachmentDownloadError(null);
    setDownloadingAttachmentId(item?.id ?? "review");
    try {
      if (item) await downloadStoredInvoiceAttachment(companyId, item.id);
      else if (invoiceReview) await downloadReviewedInvoiceAttachment(invoiceReview);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("clientBilling.annex.downloadFailed");
      if (item) setPreviewResult({ kind: "error", message });
      else setAttachmentDownloadError(message);
    } finally {
      setDownloadingAttachmentId(null);
    }
  };

  const resolveIssued = (
    item: InvoiceHistoryItem,
    invoiceNumber: string,
    netTotal: number,
    grossTotal: number,
  ) => {
    return reconcileMutation.mutateAsync({
      companyId,
      invoiceId: item.id,
      resolution: "issued",
      invoiceNumber,
      netTotal,
      grossTotal,
    });
  };

  const previewHint = preview
    ? t("clientBilling.previewDemoHint")
    : isDirty
      ? t("clientBilling.previewSaveFirst")
      : !integrationConfigured
        ? t("clientBilling.previewConnectFirst")
        : !selectedClient?.is_active
          ? t("clientBilling.previewInactiveClient")
          : !savedProfileReadiness?.complete
            ? t("clientBilling.previewCompleteProfile")
            : !invoicePeriodIsValid
              ? t("clientBilling.previewInvalidPeriod")
              : null;

  if (!companyId) {
    return (
      <div className="rounded-2xl border border-danger/20 bg-danger-bg p-5 text-sm text-danger">
        {t("clientBilling.companyRequired")}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1240px] space-y-5 pb-10">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-[-0.035em] text-text sm:text-[28px]">
            {t("clientBilling.title")}
          </h1>
          <InfoPopover label={t("common.infoAbout", { topic: t("clientBilling.title") })}>
            <p>{t("clientBilling.subtitle")}</p>
            <p>{t("clientBilling.manualOnlyHint")}</p>
          </InfoPopover>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!preview && !isDemoDocument ? <Button variant="secondary" icon={<Upload />}
            disabled={isDirty || saveMutation.isPending || loading || Boolean(loadError)}
            tooltip={isDirty ? t("clientBilling.partnerImport.saveFirst") : undefined}
            onClick={() => setPartnerImportOpen(true)}>
            {t("clientBilling.partnerImport.openButton")}
          </Button> : null}
          <span
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[11.5px] font-medium",
              integrationConfigured
                ? "border-success/20 bg-success-bg text-success"
                : "border-warning/25 bg-warning-bg text-warning",
            )}
          >
            {integrationConfigured ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5" />
            )}
            {integrationConfigured
              ? t("clientBilling.integrationReady")
              : t("clientBilling.integrationMissing")}
          </span>
          <span className="inline-flex h-8 items-center rounded-full border border-border bg-surface-strong/80 px-3 text-[11.5px] font-medium text-muted-strong">
            {isCompanyPreviewMode
              ? t("clientBilling.previewMode")
              : t("clientBilling.liveMode")}
          </span>
          <Link to="/admin/settings">
            <Button variant="outline" icon={<Settings2 />}>
              {t("clientBilling.integrationSettings")}
            </Button>
          </Link>
        </div>
      </header>

      {partnerImportOpen ? <PartnerBillingImportModal key={companyId} companyId={companyId}
        onClose={() => setPartnerImportOpen(false)} onComplete={async () => {
          await queryClient.invalidateQueries({ queryKey: ["clientBillingProfiles", companyId] });
          setInvoiceReview(null);
          setReviewOpen(false);
          setPreviewResult(null);
        }} /> : null}

      {!integrationConfigured && !invoiceSettingsQuery.isLoading ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-warning/20 bg-warning-bg/70 px-4 py-3.5 text-warning sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex items-center gap-1.5">
              <p className="text-[12.5px] font-semibold">
                {t("clientBilling.integrationBannerTitle")}
              </p>
              <InfoPopover label={t("common.infoAbout", { topic: t("clientBilling.integrationSettings") })}>
                {t("clientBilling.integrationBannerDescription")}
              </InfoPopover>
            </div>
          </div>
          <Link
            to="/admin/settings"
            className="inline-flex shrink-0 items-center gap-1 text-[11.5px] font-semibold hover:underline"
          >
            {t("clientBilling.configureNow")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : null}

      {loading ? (
        <Card className="flex min-h-80 items-center justify-center p-8 text-sm text-muted">
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary/25 border-t-primary-strong" />
          {t("common.loading")}
        </Card>
      ) : loadError ? (
        <Card className="border-danger/20 bg-danger-bg p-5 text-sm text-danger">
          {t("clientBilling.loadFailed")}
        </Card>
      ) : clients.length === 0 ? (
        <Card className="p-10 text-center">
          <ReceiptText className="mx-auto h-7 w-7 text-muted" />
          <h2 className="mt-3 text-sm font-semibold text-text">
            {t("clientBilling.noClientsTitle")}
          </h2>
          <p className="mt-1 text-xs text-muted">
            {t("clientBilling.noClientsDescription")}
          </p>
          <Link to="/admin/settings" className="mt-4 inline-flex">
            <Button variant="outline">{t("clientBilling.manageClients")}</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[290px_minmax(0,1fr)]">
          <Card className="lg:sticky lg:top-7">
            <div className="border-b border-border bg-bg-accent/40 p-3.5">
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <h2 className="text-[13px] font-semibold text-text">{t("clientBilling.clientsTitle")}</h2>
                <span className="text-[10.5px] text-muted" aria-label={t("clientBilling.clientsCount", { count: clients.length })}>{clients.length}</span>
              </div>
              <Input
                aria-label={t("clientBilling.searchClients")}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={t("clientBilling.searchClients")}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>

            <div className="max-h-[360px] space-y-1 overflow-y-auto p-2 lg:max-h-[640px]">
              {filteredClientRows.length > 0 ? (
                filteredClientRows.map(({ client, readiness }) => {
                  const isSelected = client.id === effectiveSelectedClientId;
                  return (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => selectClient(client.id)}
                      className={cn(
                        "group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                        isSelected
                          ? "border-primary-strong/15 bg-primary/10 shadow-[inset_0_0_0_1px_rgba(96,120,42,0.04)]"
                          : "border-transparent hover:border-border hover:bg-black/[0.025]",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-[11px] font-semibold",
                          readiness.complete
                            ? "bg-success-bg text-success"
                            : "bg-bg-accent text-muted-strong",
                        )}
                      >
                        {readiness.complete ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          client.name.slice(0, 2).toUpperCase()
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-medium text-text">
                          {client.name}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-muted">
                          <span>{client.client_code}</span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={cn(readiness.complete && "font-medium text-success")}
                          >
                            {readiness.complete
                              ? t("clientBilling.statusReady")
                              : t("clientBilling.statusIncomplete")}
                          </span>
                        </span>
                      </span>
                      {!client.is_active ? (
                        <span className="rounded-full bg-bg-accent px-1.5 py-0.5 text-[9px] font-medium text-muted">
                          {t("common.inactive")}
                        </span>
                      ) : null}
                    </button>
                  );
                })
              ) : (
                <div className="px-3 py-8 text-center text-xs text-muted">
                  {t("clientBilling.noSearchResults")}
                </div>
              )}
            </div>
          </Card>

          {selectedClient && draft && draftReadiness ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Card>
                <div className="border-b border-border bg-bg-accent/35 px-4.5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="min-w-0 break-words text-base font-semibold text-text">{selectedClient.name}</h2>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium",
                      draftReadiness.complete ? "bg-success-bg text-success" : "bg-warning-bg text-warning")}>
                      {t(draftReadiness.complete ? "clientBilling.statusReady" : "clientBilling.statusIncomplete")}
                    </span>
                  </div>
                  {!draftReadiness.complete ? (
                    <div className="mt-3 text-xs text-warning">
                      <p>{t("clientBilling.missingFieldsTitle", { count: draftReadiness.missingFields.length })}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {draftReadiness.missingFields.map((field: BillingProfileField) => (
                          <span key={field} className="rounded-full border border-warning/20 bg-warning-bg px-2 py-0.5 text-[10px]">
                            {t(`clientBilling.fields.${field}`)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="divide-y divide-border">
                  <section className="space-y-3 p-4.5">
                    <SectionHeading title={t("clientBilling.identityTitle")}>
                      <p>{t("clientBilling.identityDescription")}</p>
                      <p>{t("clientBilling.taxDescription")}</p>
                      <p>{t("clientBilling.groupTaxNumberHint")}</p>
                    </SectionHeading>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        id="billing-name"
                        label={t("clientBilling.billingName")}
                        value={draft.billing_name ?? ""}
                        onChange={(event) =>
                          updateDraft((current) => ({
                            ...current,
                            billing_name: event.target.value,
                          }))
                        }
                        className="sm:col-span-2"
                      />
                      <Input
                        id="billing-country-code"
                        label={t("clientBilling.countryCode")}
                        value={draft.billing_country_code}
                        maxLength={2}
                        onChange={(event) =>
                          updateDraft((current) => ({
                            ...current,
                            billing_country_code: event.target.value.toUpperCase(),
                          }))
                        }
                      />
                      <Input
                        id="billing-postal-code"
                        label={t("clientBilling.postalCode")}
                        value={draft.billing_postal_code ?? ""}
                        onChange={(event) =>
                          updateDraft((current) => ({
                            ...current,
                            billing_postal_code: event.target.value,
                          }))
                        }
                      />
                      <Input
                        id="billing-city"
                        label={t("clientBilling.city")}
                        value={draft.billing_city ?? ""}
                        onChange={(event) =>
                          updateDraft((current) => ({
                            ...current,
                            billing_city: event.target.value,
                          }))
                        }
                      />
                      <Input
                        id="billing-address"
                        label={t("clientBilling.address")}
                        value={draft.billing_address ?? ""}
                        onChange={(event) =>
                          updateDraft((current) => ({
                            ...current,
                            billing_address: event.target.value,
                          }))
                        }
                      />
                      <Select
                        id="tax-subject"
                        label={t("clientBilling.taxSubject")}
                        value={draft.tax_subject === null ? "" : String(draft.tax_subject)}
                        onChange={(event) =>
                          updateDraft((current) => ({
                            ...current,
                            tax_subject:
                              event.target.value === ""
                                ? null
                                : (Number(event.target.value) as TaxSubject),
                          }))
                        }
                      >
                        <option value="">{t("clientBilling.taxSubjectPlaceholder")}</option>
                        <option value="1">{t("clientBilling.taxSubjectDomestic")}</option>
                        <option value="6">{t("clientBilling.taxSubjectEu")}</option>
                        <option value="7">{t("clientBilling.taxSubjectNonEu")}</option>
                        <option value="0">{t("clientBilling.taxSubjectUnknown")}</option>
                        <option value="-1">{t("clientBilling.taxSubjectNoNumber")}</option>
                      </Select>
                      <Input
                        id="tax-number"
                        label={t("clientBilling.taxNumber")}
                        value={draft.tax_number ?? ""}
                        onChange={(event) =>
                          updateDraft((current) => ({
                            ...current,
                            tax_number: event.target.value,
                          }))
                        }
                      />
                      <Input
                        id="eu-vat-number"
                        label={t("clientBilling.euVatNumber")}
                        value={draft.eu_vat_number ?? ""}
                        onChange={(event) =>
                          updateDraft((current) => ({
                            ...current,
                            eu_vat_number: event.target.value,
                          }))
                        }
                      />
                      <Input
                        id="group-tax-number"
                        label={t("clientBilling.groupTaxNumber")}
                        value={draft.group_tax_number ?? ""}
                        onChange={(event) =>
                          updateDraft((current) => ({
                            ...current,
                            group_tax_number: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </section>
                  <section className="space-y-3 p-4.5">
                    <SectionHeading title={t("clientBilling.commercialTitle")}>
                      <p>{t("clientBilling.invoiceConfigurationHint")}</p>
                    </SectionHeading>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Select
                        id="vat-code"
                        label={t("clientBilling.vatCode")}
                        value={draft.vat_code}
                        onChange={(event) =>
                          updateDraft((current) => ({
                            ...current,
                            vat_code: event.target.value,
                          }))
                        }
                      >
                        {VAT_CODES.map((vatCode) => (
                          <option key={vatCode} value={vatCode}>
                            {vatCode.match(/^\d/) ? `${vatCode}%` : vatCode}
                          </option>
                        ))}
                      </Select>
                      <Select
                        id="payment-method"
                        label={t("clientBilling.paymentMethod")}
                        value={draft.payment_method}
                        onChange={(event) =>
                          updateDraft((current) => ({
                            ...current,
                            payment_method: event.target.value,
                          }))
                        }
                      >
                        <option value="Átutalás">{t("clientBilling.paymentTransfer")}</option>
                        <option value="Készpénz">{t("clientBilling.paymentCash")}</option>
                        <option value="Bankkártya">{t("clientBilling.paymentCard")}</option>
                        <option value="PayPal">PayPal</option>
                      </Select>
                      <InvoiceTermsFields profile={draft} onChange={changes =>
                        updateDraft(current => ({ ...current, ...changes }))} />
                      <Select
                        id="invoice-language"
                        label={t("clientBilling.invoiceLanguage")}
                        value={draft.invoice_language}
                        onChange={(event) =>
                          updateDraft((current) => ({
                            ...current,
                            invoice_language: event.target.value as typeof current.invoice_language,
                          }))
                        }
                      >
                        {LANGUAGE_CODES.map((language) => (
                          <option key={language} value={language}>
                            {language.toUpperCase()}
                          </option>
                        ))}
                      </Select>
                      <Select label={t("clientBilling.fulfillmentDatePolicy")}
                        value={draft.fulfillment_date_policy ?? "period_end"}
                        onChange={event => updateDraft(current => ({ ...current,
                          fulfillment_date_policy: event.target.value as NonNullable<ClientBillingProfile["fulfillment_date_policy"]> }))}>
                        <option value="period_end">{t("clientBilling.fulfillmentPeriodEnd")}</option>
                        <option value="due_date">{t("clientBilling.fulfillmentDueDate")}</option>
                        <option value="issue_date">{t("clientBilling.fulfillmentIssueDate")}</option>
                      </Select>
                      <Select label={t("clientBilling.invoiceDocumentType")}
                        value={draft.invoice_electronic ? "electronic" : "paper"}
                        onChange={event => updateDraft(current => ({ ...current, invoice_electronic: event.target.value === "electronic" }))}>
                        <option value="paper">{t("clientBilling.paperInvoice")}</option>
                        <option value="electronic">{t("clientBilling.electronicInvoice")}</option>
                      </Select>
                      <Input label={t("clientBilling.invoicePrefix")} maxLength={32}
                        value={draft.invoice_prefix ?? ""}
                        onChange={event => updateDraft(current => ({ ...current, invoice_prefix: event.target.value || null }))} />
                      <Input label={t("clientBilling.sellerBankName")} maxLength={120}
                        value={draft.seller_bank_name ?? ""}
                        onChange={event => updateDraft(current => ({ ...current, seller_bank_name: event.target.value || null }))} />
                      <Input label={t("clientBilling.sellerBankAccount")} maxLength={120}
                        className="sm:col-span-2 [&_label]:max-w-[calc(100%_-_1.5rem)] [&_label]:truncate"
                        value={draft.seller_bank_account ?? ""}
                        onChange={event => updateDraft(current => ({ ...current, seller_bank_account: event.target.value || null }))} />
                    </div>
                  </section>
                  <section className="space-y-3 p-4.5">
                    <SectionHeading title={t("clientBilling.deliveryTitle")}>
                      <p>{t("clientBilling.deliveryDescription")}</p>
                    </SectionHeading>
                    <Input
                      id="billing-email"
                      type="email"
                      label={t("clientBilling.billingEmail")}
                      value={draft.billing_email ?? ""}
                      onChange={(event) =>
                        updateDraft((current) => ({
                          ...current,
                          billing_email: event.target.value,
                        }))
                      }
                    />
                    <SwitchRow
                      id="send-invoice-email"
                      title={t("clientBilling.sendInvoiceEmail")}
                      description={t("clientBilling.sendInvoiceEmailDescription")}
                      checked={draft.send_invoice_email}
                      onChange={(checked) =>
                        updateDraft((current) => ({
                          ...current,
                          send_invoice_email: checked,
                        }))
                      }
                    />
                    <div className="rounded-xl border border-border bg-bg-accent/35 p-3 text-sm">
                      <p className="font-medium text-text">{t("clientBilling.attachTimesheet")}</p>
                      <p className="mt-1 text-muted">{t("clientBilling.attachTimesheetDescription")}</p>
                    </div>
                  </section>
                </div>
              </Card>

              <Card>
                <div className="border-b border-border bg-bg-accent/35 px-4.5 py-3">
                  <SectionHeading level="h2" title={t("clientBilling.previewTitle")}>
                    <p>{t("clientBilling.previewDescription")}</p>
                    <p>{t("clientBilling.previewSafetyHint")}</p>
                    <p>{t("clientBilling.manualOnlyHint")}</p>
                  </SectionHeading>
                </div>
                <div className="space-y-3 p-4.5">
                  <div className="grid items-end gap-3 sm:grid-cols-2">
                    <Input
                      id="invoice-period-start"
                      type="date"
                      label={t("clientBilling.periodStart")}
                      value={invoicePeriod.start}
                      onChange={(event) => {
                        setManualDates({});
                        setInvoiceReview(null);
                        setInvoicePeriod((current) => ({
                          ...current,
                          start: event.target.value,
                        }));
                        setPreviewResult(null);
                      }}
                    />
                    <Input
                      id="invoice-period-end"
                      type="date"
                      label={t("clientBilling.periodEnd")}
                      value={invoicePeriod.end}
                      onChange={(event) => {
                        setManualDates({});
                        setInvoiceReview(null);
                        setInvoicePeriod((current) => ({
                          ...current,
                          end: event.target.value,
                        }));
                        setPreviewResult(null);
                      }}
                    />
                  </div>
                  {!preview ? <details className="rounded-xl border border-border bg-bg-accent/25 p-3.5">
                    <summary className="cursor-pointer text-xs font-semibold text-text">{t("clientBilling.terms.customDatesTitle")}</summary>
                    <p className="mt-2 text-xs leading-5 text-muted">{t("clientBilling.terms.optionalDatesHelp")}</p>
                    <div className="mt-3">
                      <InvoiceDateFields dueDate={manualDates.due_date ?? ""} fulfillmentDate={manualDates.fulfillment_date ?? ""}
                        disabled={reviewMutation.isPending || previewMutation.isPending}
                        onDueChange={value => { setManualDates(current => ({ ...current, due_date: value || null })); setInvoiceReview(null); setPreviewResult(null); }}
                        onFulfillmentChange={value => { setManualDates(current => ({ ...current, fulfillment_date: value || null })); setInvoiceReview(null); setPreviewResult(null); }} />
                    </div>
                  </details> : null}
                  {!preview ? (
                    <ProjectInvoicePricing key={quantityScope} companyId={companyId}
                      clientId={effectiveSelectedClientId} year={Number(invoicePeriod.start.slice(0, 4))}
                      quantities={quantityDraft} onQuantityChange={(projectId, value) => {
                        setQuantityDrafts(current => ({ ...current, [quantityScope]: { ...current[quantityScope], [projectId]: value } }));
                        setInvoiceReview(null); setIssueError(null); setPreviewResult(null);
                      }} />
                  ) : null}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      size="lg"
                      variant="outline"
                      icon={<Download />}
                      disabled={!canGeneratePreview || previewMutation.isPending}
                      onClick={generatePreview}
                      className="w-full sm:w-auto"
                    >
                      {previewMutation.isPending
                        ? t("clientBilling.generatingPreview")
                        : t("clientBilling.generatePreview")}
                    </Button>
                    <Button
                      type="button"
                      size="lg"
                      icon={<Eye />}
                      disabled={!canReviewInvoice || reviewMutation.isPending}
                      onClick={generateReview}
                      className="w-full sm:w-auto"
                    >
                      {reviewMutation.isPending
                        ? t("clientBilling.loadingReview")
                        : t("clientBilling.reviewAndIssue")}
                    </Button>
                  </div>
                  {previewResult || previewHint ? <div role={previewResult?.kind === "error" ? "alert" : "status"} className="text-[11px] leading-5">
                    {previewResult ? (
                      <span
                        className={cn(
                          "inline-flex items-start gap-1.5 font-medium",
                          previewResult.kind === "success"
                            ? "text-success"
                            : "text-danger",
                        )}
                      >
                        {previewResult.kind === "success" ? (
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        ) : (
                          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        )}
                        {previewResult.message}
                      </span>
                    ) : (
                      <span className="text-muted">{previewHint}</span>
                    )}
                  </div> : null}
                </div>
              </Card>

              {isDirty || result ? (
                <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-2xl border border-border-strong bg-surface-strong/94 px-4 py-3 shadow-[0_12px_36px_rgba(75,87,57,0.12)] backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between">
                  <div role={result?.kind === "error" ? "alert" : "status"} className="min-h-5 text-[11.5px]">
                    {result ? (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 font-medium",
                          result.kind === "success" ? "text-success" : "text-danger",
                        )}
                      >
                        {result.kind === "success" ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5" />
                        )}
                        {result.message}
                      </span>
                    ) : (
                      <span className="text-muted">{t("clientBilling.unsavedChanges")}</span>
                    )}
                  </div>
                  {isDirty ? (
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        disabled={!isDirty || saveMutation.isPending}
                        onClick={cancelChanges}
                      >
                        {t("common.cancel")}
                      </Button>
                      <Button
                        type="submit"
                        size="lg"
                        disabled={!isDirty || saveMutation.isPending}
                        icon={<Check />}
                      >
                        {saveMutation.isPending
                          ? t("common.saving")
                          : t("clientBilling.saveProfile")}
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </form>
          ) : null}
        </div>
      )}

      {!preview ? (
        <InvoiceHistoryCard
          scope={historyScope}
          onScopeChange={setHistoryScope}
          selectedClientName={selectedClient?.name ?? null}
          history={historyQuery.data ?? []}
          loading={historyQuery.isLoading}
          error={Boolean(historyQuery.error)}
          downloadingId={downloadingInvoiceId}
          downloadingAttachmentId={downloadingAttachmentId}
          onDownloadAttachment={(item) => void downloadInvoiceAttachment(item)}
          reconciling={reconcileMutation.isPending}
          reversing={stornoMutation.isPending}
          canReverse={!isCompanyPreviewMode}
          onStorno={(params) => stornoMutation.mutateAsync(params)}
          onDownloadStorno={(item) => void downloadInvoicePdf(item, true)}
          onDownload={(item) => void downloadInvoicePdf(item)}
          onResolveNotIssued={resolveNotIssued}
          onResolveIssued={resolveIssued}
        />
      ) : null}

      <InvoiceReviewModal
        key={invoiceReview?.review_fingerprint ?? "empty-review"}
        open={reviewOpen}
        review={invoiceReview}
        issuing={issueMutation.isPending}
        reviewing={reviewMutation.isPending}
        previewDownloading={previewMutation.isPending}
        onDownloadPreview={() => {
          if (!invoiceReview || !selectedClient) return;
          setIssueError(null);
          previewMutation.mutate({ companyId: invoiceReview.company_id, clientId: invoiceReview.client_id,
            clientCode: selectedClient.client_code, periodStart: invoiceReview.period_start,
            periodEnd: invoiceReview.period_end, projectQuantities: invoiceReview.project_quantities,
            dateOverrides: invoiceReview.date_overrides ?? {}, reviewFingerprint: invoiceReview.review_fingerprint }, {
            onError: error => setIssueError(error instanceof Error ? error.message : t("clientBilling.previewFailed")),
          });
        }}
        onReviewDates={async (dateOverrides: InvoiceDateOverrides) => {
          if (!invoiceReview) return;
          setIssueError(null);
          try {
            await reviewMutation.mutateAsync({ companyId: invoiceReview.company_id, clientId: invoiceReview.client_id,
              periodStart: invoiceReview.period_start, periodEnd: invoiceReview.period_end,
              projectQuantities: invoiceReview.project_quantities, dateOverrides });
          } catch (error) {
            setIssueError(error instanceof Error ? error.message : t("clientBilling.reviewFailed"));
          }
        }}
        canIssue={!isCompanyPreviewMode}
        error={issueError}
        attachmentDownloading={downloadingAttachmentId === "review"}
        attachmentError={attachmentDownloadError}
        onDownloadAttachment={() => void downloadInvoiceAttachment()}
        onClose={() => {
          setReviewOpen(false);
          setIssueError(null);
        }}
        onIssue={() => {
          if (invoiceReview) issueMutation.mutate(invoiceReview);
        }}
      />
    </div>
  );
};
