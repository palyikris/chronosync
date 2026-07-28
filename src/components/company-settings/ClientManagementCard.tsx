// src/components/company-settings/ClientManagementCard.tsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Check,
  PencilLine,
  Plus,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
  Users,
} from "lucide-react";
import { Input } from "../shared/Input";
import { Button } from "../shared/Button";
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
import { Select } from "../shared/Select";

const DEFAULT_INVOICE_ATTACHMENT_LANGUAGE: InvoiceAttachmentLanguage = "en";

const normalizeInvoiceAttachmentLanguage = (
  language: InvoiceAttachmentLanguage | null | undefined,
): InvoiceAttachmentLanguage => {
  return language === "hu" ? "hu" : "en";
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
  const [newClientLanguage, setNewClientLanguage] =
    useState<InvoiceAttachmentLanguage>(DEFAULT_INVOICE_ATTACHMENT_LANGUAGE);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;
    try {
      setLoading(true);
      await createClient(companyId, newClientName.trim(), newClientLanguage);
      setNewClientName("");
      setNewClientLanguage(DEFAULT_INVOICE_ATTACHMENT_LANGUAGE);
      onRefresh();
    } catch (err) {
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
    if (!editingClient || !editingClient.name.trim()) return;
    try {
      setLoading(true);
      await updateClient(
        editingClient.id,
        editingClient.name.trim(),
        normalizeInvoiceAttachmentLanguage(
          editingClient.invoice_attachment_language,
        ),
      );
      setEditingClient(null);
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
        <form
          onSubmit={handleCreate}
          className="flex flex-col gap-2 md:flex-row"
        >
          <Input
            placeholder={t("companySettings.newClientName")}
            value={newClientName}
            onChange={(e) => setNewClientName(e.target.value)}
            className="flex-1"
          />
          <Select
            value={newClientLanguage}
            onChange={(event) =>
              setNewClientLanguage(
                event.target.value as InvoiceAttachmentLanguage,
              )
            }
            className="md:w-44"
          >
            <option value="en">
              {t("companySettings.invoiceAttachmentLanguageEn")}
            </option>
            <option value="hu">
              {t("companySettings.invoiceAttachmentLanguageHu")}
            </option>
          </Select>
          <Button
            type="submit"
            disabled={loading || !newClientName.trim()}
            className="gap-1 rounded-xl px-4"
            icon={<Plus className="h-4 w-4" />}
          >
            {t("common.add")}
          </Button>
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
                    {t("companySettings.invoiceAttachmentLabel")}{" "}
                    {normalizeInvoiceAttachmentLanguage(
                      client.invoice_attachment_language,
                    ).toUpperCase()}
                  </span>
                  <span className="mt-1 text-xs text-muted-strong">
                    {client.is_active
                      ? t("common.active")
                      : t("common.inactive")}
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
                    variant="secondary"
                    onClick={() =>
                      setEditingClient({
                        ...client,
                        invoice_attachment_language:
                          normalizeInvoiceAttachmentLanguage(
                            client.invoice_attachment_language,
                          ),
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
        >
          <div className="space-y-4 p-4">
            <Input
              placeholder={t("companySettings.clientNamePlaceholder")}
              value={editingClient.name}
              onChange={(e) =>
                setEditingClient({ ...editingClient, name: e.target.value })
              }
            />
            <Select
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
