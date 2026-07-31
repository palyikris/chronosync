// src/components/company-settings/ClientManagementCard.tsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Check,
  PencilLine,
  Plus,
  Star,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
  Users,
} from "lucide-react";
import { Button } from "../shared/Button";
import { Input } from "../shared/Input";
import { Select } from "../shared/Select";
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
    if (!editingClient) return;

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
    <Card className="space-y-6 p-6 shadow-sm">
      <CardHeader className="rounded-t-2xl border-b-0 bg-transparent px-0 py-0">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-bg-accent p-2.5 text-primary-strong">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold text-text">
              {t("companySettings.clientsTitle")}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-strong">
              {t("companySettings.clientsSubtitle")}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 px-0 pb-0">
        <form onSubmit={handleCreate} className="space-y-3">
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
          <div className="flex items-center justify-between rounded-xl border border-border-strong bg-bg-accent px-4 py-3">
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

        <div className="max-h-72 space-y-2 overflow-y-auto px-2">
          {clients.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border-strong bg-bg-accent px-4 py-3 text-sm text-muted-strong">
              {t("companySettings.noClients")}
            </p>
          ) : (
            clients.map((client) => (
              <div
                key={client.id}
                className={`flex items-center justify-between rounded-xl border border-border-strong bg-bg p-3 ${
                  client.is_active ? "" : "opacity-60"
                }`}
              >
                <div className="min-w-0">
                  <span className="block truncate font-medium text-text">
                    {client.name}
                  </span>
                  <span className="mt-1 block text-xs text-muted-strong">
                    {t("companySettings.clientCodeLabel")}: {client.client_code}
                  </span>
                  <span className="mt-1 block text-xs text-muted-strong">
                    {t("companySettings.invoiceAttachmentLabel")}{" "}
                    {normalizeInvoiceAttachmentLanguage(
                      client.invoice_attachment_language,
                    ).toUpperCase()}
                  </span>
                  <span className="mt-1 block text-xs text-muted-strong">
                    {t("companySettings.availableHoursPerMonth")}:{" "}
                    {client.available_hours_per_month ?? 0}
                  </span>
                  <span className="mt-1 block text-xs text-muted-strong">
                    {t("companySettings.hoursFromPreviousMonth")}:{" "}
                    {client.hours_from_previous_month ?? 0}
                  </span>
                  <span className="mt-1 text-xs text-muted-strong">
                    {client.is_active
                      ? t("common.active")
                      : t("common.inactive")}
                  </span>
                  <span className="mt-1 block text-xs text-muted-strong">
                    {client.is_default
                      ? t("companySettings.defaultLabel")
                      : t("companySettings.defaultClientNotSelected")}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleToggleActivity(client)}
                    disabled={loading}
                    className="rounded-xl px-3"
                    icon={
                      client.is_active ? (
                        <ToggleRight className="h-4 w-4" />
                      ) : (
                        <ToggleLeft className="h-4 w-4" />
                      )
                    }
                  ></Button>
                  <Button
                    size="sm"
                    variant={client.is_default ? "primary" : "secondary"}
                    onClick={() => handleToggleDefault(client)}
                    disabled={loading}
                    className="rounded-xl px-3"
                    icon={<Star className="h-4 w-4" />}
                  ></Button>
                  <Button
                    size="sm"
                    variant="secondary"
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
                    className="rounded-xl px-3"
                    icon={<PencilLine className="h-4 w-4" />}
                  ></Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setDeletingClientId(client.id)}
                    disabled={loading}
                    className="rounded-xl px-3"
                    icon={<Trash2 className="h-4 w-4" />}
                  ></Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>

      {/* Edit Modal */}
      {editingClient && (
        <Modal
          open={!!editingClient}
          onClose={() => setEditingClient(null)}
          title={t("companySettings.editClient")}
          className="w-xl max-w-full"
        >
          <div className="space-y-4 p-4">
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
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingClientId && (
        <Modal
          open={!!deletingClientId}
          onClose={() => setDeletingClientId(null)}
          title={t("companySettings.deleteClient")}
        >
          <div className="space-y-4 p-4">
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
          </div>
        </Modal>
      )}
    </Card>
  );
};
