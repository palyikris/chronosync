// src/components/company-settings/ClientManagementCard.tsx
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Check,
  ChevronRight,
  PencilLine,
  Plus,
  Search,
  Star,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
  Users,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "../shared/Button";
import { Input } from "../shared/Input";
import { Select } from "../shared/Select";
import { cn } from "../../utils/cn";
import { Modal } from "../shared/Modal";
import { Card, CardContent, CardHeader, CardTitle } from "../shared/Card";
import {
  createClient,
  deleteClient,
  updateClientActivity,
  updateClient,
} from "../../services/clientProjectService";
import {
  type Client,
  type InvoiceAttachmentLanguage,
} from "../../types/client-project";
import { ClientImportModal } from "./ClientImportModal";

const DEFAULT_INVOICE_ATTACHMENT_LANGUAGE: InvoiceAttachmentLanguage = "en";
const CLIENT_CODE_MAX_LENGTH = 3;

const normalizeInvoiceAttachmentLanguage = (
  language: InvoiceAttachmentLanguage | null | undefined,
): InvoiceAttachmentLanguage => {
  return language === "hu" ? "hu" : "en";
};

const normalizeNumericInputValue = (value: string): number => {
  if (value === "") return 0;
  const parsedValue = Number(value);
  return Number.isNaN(parsedValue) ? 0 : parsedValue;
};

const normalizeClientCode = (value: string) => value.trim();

const hasDuplicateClientCode = (
  clients: Client[],
  clientCode: string,
  excludedClientId?: string,
) => {
  const normalizedClientCode = normalizeClientCode(clientCode).toLowerCase();

  if (!normalizedClientCode) {
    return false;
  }

  return clients.some(
    (client) =>
      client.id !== excludedClientId &&
      normalizeClientCode(client.client_code).toLowerCase() ===
        normalizedClientCode,
  );
};

interface Props {
  companyId: string;
  clients: Client[];
  onRefresh: () => void;
}

export const ClientManagementCard: React.FC<Props> = ({
  companyId,
  clients,
  onRefresh,
}) => {
  const { t } = useTranslation();
  const [newClientName, setNewClientName] = useState("");
  const [newClientCode, setNewClientCode] = useState("");
  const [newClientLanguage, setNewClientLanguage] =
    useState<InvoiceAttachmentLanguage>(DEFAULT_INVOICE_ATTACHMENT_LANGUAGE);
  const [newClientAvailableHours, setNewClientAvailableHours] = useState(0);
  const [newClientHoursFromPreviousMonth, setNewClientHoursFromPreviousMonth] =
    useState(0);
  const [newClientIsDefault, setNewClientIsDefault] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isClientFiltersCollapsed, setIsClientFiltersCollapsed] =
    useState(true);
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [clientStatusFilter, setClientStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  const filteredClients = useMemo(() => {
    const normalizedTerm = clientSearchTerm.trim().toLowerCase();

    return [...clients]
      .filter((client) => {
        const matchesSearch =
          !normalizedTerm ||
          client.name.toLowerCase().includes(normalizedTerm) ||
          client.client_code.toLowerCase().includes(normalizedTerm);

        const matchesStatus =
          clientStatusFilter === "all"
            ? true
            : clientStatusFilter === "active"
              ? client.is_active
              : !client.is_active;

        return matchesSearch && matchesStatus;
      })
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [clientSearchTerm, clientStatusFilter, clients]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const clientName = newClientName.trim();
    const clientCode = normalizeClientCode(newClientCode);

    if (!clientName || !clientCode) return;
    if (hasDuplicateClientCode(clients, clientCode)) {
      alert(t("companySettings.duplicateClientCode"));
      return;
    }
    try {
      setLoading(true);
      await createClient(
        companyId,
        clientName,
        clientCode,
        newClientLanguage,
        newClientAvailableHours,
        newClientHoursFromPreviousMonth,
        newClientIsDefault,
      );
      setNewClientName("");
      setNewClientCode("");
      setNewClientLanguage(DEFAULT_INVOICE_ATTACHMENT_LANGUAGE);
      setNewClientAvailableHours(0);
      setNewClientHoursFromPreviousMonth(0);
      setNewClientIsDefault(false);
      onRefresh();
    } catch (err) {
      if (err instanceof Error && /duplicate|unique/i.test(err.message)) {
        alert(t("companySettings.duplicateClientCode"));
        return;
      }
      alert(
        err instanceof Error
          ? err.message
          : t("companySettings.failedCreateClient"),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingClient || loading) return;

    const clientName = editingClient.name.trim();
    const clientCode = normalizeClientCode(editingClient.client_code);

    if (!clientName || !clientCode) return;
    if (hasDuplicateClientCode(clients, clientCode, editingClient.id)) {
      alert(t("companySettings.duplicateClientCode"));
      return;
    }
    try {
      setLoading(true);
      await updateClient(
        editingClient.id,
        clientName,
        clientCode,
        normalizeInvoiceAttachmentLanguage(
          editingClient.invoice_attachment_language,
        ),
        editingClient.available_hours_per_month ?? 0,
        editingClient.hours_from_previous_month ?? 0,
        editingClient.is_default ?? false,
      );
      setEditingClient(null);
      onRefresh();
    } catch (err) {
      if (err instanceof Error && /duplicate|unique/i.test(err.message)) {
        alert(t("companySettings.duplicateClientCode"));
        return;
      }
      alert(
        err instanceof Error
          ? err.message
          : t("companySettings.failedUpdateClient"),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActivity = async (client: Client) => {
    try {
      setLoading(true);
      await updateClientActivity(client.id, !client.is_active);
      onRefresh();
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : t("companySettings.failedUpdateClientActivity"),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDefault = async (client: Client) => {
    try {
      setLoading(true);
      await updateClient(
        client.id,
        client.name,
        client.client_code,
        normalizeInvoiceAttachmentLanguage(client.invoice_attachment_language),
        client.available_hours_per_month ?? 0,
        client.hours_from_previous_month ?? 0,
        !(client.is_default ?? false),
      );
      onRefresh();
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : t("companySettings.failedUpdateClient"),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingClientId) return;
    try {
      setLoading(true);
      await deleteClient(deletingClientId);
      setDeletingClientId(null);
      onRefresh();
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : t("companySettings.failedDeleteClient"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border-strong">
      <CardHeader className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/30 text-primary-strong ring-1 ring-primary-strong/10">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">
                {t("companySettings.clientsTitle")}
              </CardTitle>
              <span className="rounded-full bg-bg px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted-strong ring-1 ring-border">
                {clients.length}
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-strong sm:text-sm">
              {t("companySettings.clientsSubtitle")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:shrink-0">
          <Button
            variant="outline"
            onClick={() => setIsImportModalOpen(true)}
            className="flex-1 sm:flex-none"
            icon={<FileSpreadsheet />}
          >
            {t("companySettings.clientImportButton")}
          </Button>
          <Button
            type="button"
            variant={showNewClientForm ? "secondary" : "primary"}
            onClick={() => setShowNewClientForm((value) => !value)}
            className="flex-1 sm:flex-none"
            icon={showNewClientForm ? <X /> : <Plus />}
          >
            {showNewClientForm
              ? t("common.cancel")
              : t("companySettings.newClientButton")}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-4 sm:p-5">
        {showNewClientForm && (
          <form
            onSubmit={handleCreate}
            className="space-y-4 rounded-2xl border border-primary-strong/15 bg-primary/[0.08] p-4"
          >
            <div className="flex flex-col gap-3 md:flex-row">
              <Input
                id="new-client-name"
                type="text"
                label={t("companySettings.clientNameLabel")}
                leftIcon="person"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                required
                className="md:flex-1"
              />
              <Input
                id="new-client-code"
                type="text"
                label={t("companySettings.clientCodeLabel")}
                leftIcon="badge"
                value={newClientCode}
                onChange={(e) => setNewClientCode(e.target.value)}
                maxLength={CLIENT_CODE_MAX_LENGTH}
                required
                className="md:flex-1"
              />
              <Select
                id="new-client-language"
                label={t("companySettings.invoiceAttachmentLanguageLabel")}
                leftIcon="translate"
                value={newClientLanguage}
                onChange={(event) =>
                  setNewClientLanguage(
                    event.target.value as InvoiceAttachmentLanguage,
                  )
                }
                className="md:w-100"
              >
                <option value="en">
                  {t("companySettings.invoiceAttachmentLanguageEn")}
                </option>
                <option value="hu">
                  {t("companySettings.invoiceAttachmentLanguageHu")}
                </option>
              </Select>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                id="new-client-available-hours"
                type="number"
                min="0"
                step="1"
                label={t("companySettings.availableHoursPerMonthLabel")}
                leftIcon="schedule"
                value={newClientAvailableHours}
                onChange={(event) =>
                  setNewClientAvailableHours(
                    normalizeNumericInputValue(event.target.value),
                  )
                }
              />
              <Input
                id="new-client-prev-hours"
                type="number"
                min="0"
                step="1"
                label={t("companySettings.hoursFromPreviousMonthLabel")}
                leftIcon="history"
                value={newClientHoursFromPreviousMonth}
                onChange={(event) =>
                  setNewClientHoursFromPreviousMonth(
                    normalizeNumericInputValue(event.target.value),
                  )
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border bg-surface-strong/70 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-text">
                  {t("companySettings.defaultLabel")}
                </p>
                <p className="text-xs text-muted-strong">
                  {newClientIsDefault
                    ? t("companySettings.defaultClientSelected")
                    : t("companySettings.defaultClientNotSelected")}
                </p>
              </div>
              <Button
                type="button"
                variant={newClientIsDefault ? "primary" : "secondary"}
                onClick={() => setNewClientIsDefault((value) => !value)}
                className="rounded-xl px-4"
                icon={<Star className="h-4 w-4" />}
              >
                {t("companySettings.defaultLabel")}
              </Button>
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={loading || !newClientName.trim()}
                className="gap-1 rounded-xl px-4"
                icon={<Plus className="h-4 w-4" />}
              >
                {t("common.add")}
              </Button>
            </div>
          </form>
        )}

        <div className="flex items-center gap-3 transition-all duration-300 ease-out">
          <div
            inert={isClientFiltersCollapsed}
            className={cn(
              "grid flex-1 gap-3 overflow-hidden transition-all duration-300 ease-out md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:items-end",
              isClientFiltersCollapsed
                ? "pointer-events-none max-w-0 translate-x-[-10px] opacity-0"
                : "max-w-[1000px] translate-x-0 opacity-100",
            )}
          >
            <Input
              id="client-search"
              type="text"
              aria-label={t("companySettings.searchClients")}
              placeholder={t("companySettings.clientSearchPlaceholder")}
              leftIcon={<Search className="h-4 w-4" />}
              value={clientSearchTerm}
              onChange={(event) => setClientSearchTerm(event.target.value)}
            />

            <Select
              id="client-status-filter"
              label={t("companySettings.statusFilterLabel")}
              value={clientStatusFilter}
              onChange={(event) =>
                setClientStatusFilter(
                  event.target.value as "all" | "active" | "inactive",
                )
              }
            >
              <option value="all">
                {t("companySettings.statusFilterAll")}
              </option>
              <option value="active">
                {t("companySettings.statusFilterActive")}
              </option>
              <option value="inactive">
                {t("companySettings.statusFilterInactive")}
              </option>
            </Select>
          </div>

          <div className="flex shrink-0 items-center justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "h-[2.75rem] min-h-[2.75rem] px-4 transition-[transform,background-color,border-color,box-shadow] duration-300 ease-out",
                !isClientFiltersCollapsed && "translate-x-1",
              )}
              onClick={() => {
                setIsClientFiltersCollapsed((value) => !value);
              }}
              icon={
                <ChevronRight
                  className={cn(
                    "h-4 w-4 transition-transform duration-300 ease-out",
                    !isClientFiltersCollapsed && "rotate-180",
                  )}
                />
              }
            >
              {isClientFiltersCollapsed
                ? t("companySettings.showFilters")
                : t("companySettings.hideFilters")}
            </Button>
          </div>
        </div>

        <div className="max-h-120 space-y-3 overflow-x-hidden overflow-y-auto pr-1">
          {filteredClients.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border-strong bg-bg-accent px-4 py-6 text-center text-sm text-muted-strong">
              {clients.length === 0
                ? t("companySettings.noClients")
                : t("companySettings.noClientsMatchFilter")}
            </p>
          ) : (
            filteredClients.map((client) => (
              <article
                key={client.id}
                className="group rounded-2xl border border-border-strong bg-surface-strong/80 p-4 shadow-[0_1px_2px_rgba(76,65,92,0.035)] transition-[border-color,box-shadow,background-color] duration-200 hover:border-primary-strong/35 hover:bg-surface-strong hover:shadow-card"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bg-accent text-xs font-bold uppercase tracking-[0.08em] text-primary-strong ring-1 ring-border">
                      {client.client_code.slice(0, 3)}
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-text">
                          {client.name}
                        </h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] ${
                            client.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {client.is_active
                            ? t("common.active")
                            : t("common.inactive")}
                        </span>
                        {client.is_default && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-amber-800">
                            <Star className="h-3 w-3 fill-current" />
                            {t("companySettings.defaultLabel")}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted-strong">
                        {t("companySettings.clientCodeLabel")}:{" "}
                        {client.client_code}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5 self-start rounded-xl border border-border bg-bg-accent/80 p-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleToggleActivity(client)}
                      disabled={loading}
                      className={client.is_active ? "text-primary-strong" : ""}
                      tooltip={
                        client.is_active
                          ? t("companySettings.deactivateClient")
                          : t("companySettings.activateClient")
                      }
                      aria-label={
                        client.is_active
                          ? t("companySettings.deactivateClient")
                          : t("companySettings.activateClient")
                      }
                      icon={
                        client.is_active ? (
                          <ToggleRight className="h-4 w-4" />
                        ) : (
                          <ToggleLeft className="h-4 w-4" />
                        )
                      }
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleToggleDefault(client)}
                      disabled={loading}
                      className={
                        client.is_default
                          ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
                          : ""
                      }
                      tooltip={
                        client.is_default
                          ? t("companySettings.removeClientDefault")
                          : t("companySettings.setClientDefault")
                      }
                      aria-label={
                        client.is_default
                          ? t("companySettings.removeClientDefault")
                          : t("companySettings.setClientDefault")
                      }
                      icon={<Star className="h-4 w-4" />}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setEditingClient({
                          ...client,
                          invoice_attachment_language:
                            normalizeInvoiceAttachmentLanguage(
                              client.invoice_attachment_language,
                            ),
                          available_hours_per_month:
                            client.available_hours_per_month ?? 0,
                          hours_from_previous_month:
                            client.hours_from_previous_month ?? 0,
                          client_code: client.client_code,
                        })
                      }
                      disabled={loading}
                      tooltip={t("companySettings.editClient")}
                      aria-label={t("companySettings.editClient")}
                      icon={<PencilLine className="h-4 w-4" />}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeletingClientId(client.id)}
                      disabled={loading}
                      className="text-danger hover:bg-danger-bg hover:text-danger"
                      tooltip={t("companySettings.deleteClient")}
                      aria-label={t("companySettings.deleteClient")}
                      icon={<Trash2 className="h-4 w-4" />}
                    />
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-1 gap-x-5 gap-y-3 border-t border-border pt-3 sm:ml-[3.25rem] sm:grid-cols-2 lg:grid-cols-3">
                  <div className="min-w-0">
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.07em] text-muted">
                      {t("companySettings.invoiceAttachmentLanguageLabel")}
                    </dt>
                    <dd className="mt-0.5 text-sm font-medium text-text">
                      {normalizeInvoiceAttachmentLanguage(
                        client.invoice_attachment_language,
                      ).toUpperCase()}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.07em] text-muted">
                      {t("companySettings.availableHoursPerMonth")}
                    </dt>
                    <dd className="mt-0.5 text-sm font-medium tabular-nums text-text">
                      {client.available_hours_per_month ?? 0}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.07em] text-muted">
                      {t("companySettings.hoursFromPreviousMonth")}
                    </dt>
                    <dd className="mt-0.5 text-sm font-medium tabular-nums text-text">
                      {client.hours_from_previous_month ?? 0}
                    </dd>
                  </div>
                </dl>
              </article>
            ))
          )}
        </div>
      </CardContent>

      {/* Edit Modal */}
      {editingClient && (
        <Modal
          open={!!editingClient}
          onClose={() => { if (!loading) setEditingClient(null); }}
          title={t("companySettings.editClient")}
          className="w-xl max-w-full"
        >
          <fieldset disabled={loading} className="min-w-0 space-y-4 p-4">
            <Input
              id="edit-client-name"
              type="text"
              label={t("companySettings.clientNameLabel")}
              leftIcon="person"
              value={editingClient.name}
              onChange={(e) =>
                setEditingClient({ ...editingClient, name: e.target.value })
              }
              required
            />
            <Input
              id="edit-client-code"
              type="text"
              label={t("companySettings.clientCodeLabel")}
              leftIcon="badge"
              value={editingClient.client_code}
              onChange={(e) =>
                setEditingClient({
                  ...editingClient,
                  client_code: e.target.value,
                })
              }
              maxLength={CLIENT_CODE_MAX_LENGTH}
              required
            />
            <Select
              id="edit-client-language"
              label={t("companySettings.invoiceAttachmentLanguageLabel")}
              leftIcon="translate"
              value={normalizeInvoiceAttachmentLanguage(
                editingClient.invoice_attachment_language,
              )}
              onChange={(event) =>
                setEditingClient({
                  ...editingClient,
                  invoice_attachment_language: event.target
                    .value as InvoiceAttachmentLanguage,
                })
              }
            >
              <option value="en">
                {t("companySettings.invoiceAttachmentLanguageLabelEn")}
              </option>
              <option value="hu">
                {t("companySettings.invoiceAttachmentLanguageLabelHu")}
              </option>
            </Select>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                id="edit-client-available-hours"
                type="number"
                min="0"
                step="1"
                label={t("companySettings.availableHoursPerMonthLabel")}
                leftIcon="schedule"
                value={editingClient.available_hours_per_month ?? 0}
                onChange={(event) =>
                  setEditingClient({
                    ...editingClient,
                    available_hours_per_month: normalizeNumericInputValue(
                      event.target.value,
                    ),
                  })
                }
              />
              <Input
                id="edit-client-prev-hours"
                type="number"
                min="0"
                step="1"
                label={t("companySettings.hoursFromPreviousMonthLabel")}
                leftIcon="history"
                value={editingClient.hours_from_previous_month ?? 0}
                onChange={(event) =>
                  setEditingClient({
                    ...editingClient,
                    hours_from_previous_month: normalizeNumericInputValue(
                      event.target.value,
                    ),
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border-strong bg-bg-accent px-4 py-3">
              <div>
                <p className="text-sm font-medium text-text">
                  {t("companySettings.defaultLabel")}
                </p>
                <p className="text-xs text-muted-strong">
                  {editingClient.is_default
                    ? t("companySettings.defaultClientSelected")
                    : t("companySettings.defaultClientNotSelected")}
                </p>
              </div>
              <Button
                type="button"
                variant={editingClient.is_default ? "primary" : "secondary"}
                onClick={() =>
                  setEditingClient({
                    ...editingClient,
                    is_default: !editingClient.is_default,
                  })
                }
                className="rounded-xl px-4"
                icon={<Star className="h-4 w-4" />}
              >
                {t("companySettings.defaultLabel")}
              </Button>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setEditingClient(null)}
                className="rounded-xl"
                icon={<X className="h-4 w-4" />}
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={loading}
                className="rounded-xl"
                icon={<Check className="h-4 w-4" />}
              >
                {t("companySettings.saveChanges")}
              </Button>
            </div>
          </fieldset>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingClientId && (
        <Modal
          open={!!deletingClientId}
          onClose={() => { if (!loading) setDeletingClientId(null); }}
          title={t("companySettings.deleteClient")}
        >
          <fieldset disabled={loading} className="min-w-0 space-y-4 p-4">
            <p className="text-sm text-slate-600">
              {t("companySettings.confirmDeleteClient")}
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setDeletingClientId(null)}
                className="rounded-xl"
                icon={<X className="h-4 w-4" />}
              >
                {t("common.cancel")}
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={loading}
                className="rounded-xl"
                icon={<Trash2 className="h-4 w-4" />}
              >
                {t("companySettings.confirmDelete")}
              </Button>
            </div>
          </fieldset>
        </Modal>
      )}

      <ClientImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        companyId={companyId}
        onImportComplete={onRefresh}
      />
    </Card>
  );
};
