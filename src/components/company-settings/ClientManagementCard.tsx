// src/components/company-settings/ClientManagementCard.tsx
import React, { useState } from "react";
import {
  PencilLine,
  Plus,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Users,
} from "lucide-react";
import { type Client } from "../../types/client-project";
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
  const [newClientName, setNewClientName] = useState("");
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;
    try {
      setLoading(true);
      await createClient(companyId, newClientName.trim());
      setNewClientName("");
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create client");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingClient || !editingClient.name.trim()) return;
    try {
      setLoading(true);
      await updateClient(editingClient.id, editingClient.name.trim());
      setEditingClient(null);
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update client");
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
        err instanceof Error ? err.message : "Failed to update client activity",
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
          : "Failed to delete client. Check dependent projects/timesheets.",
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
              1. Manage Clients
            </CardTitle>
            <p className="mt-1 text-sm text-muted-strong">
              Create, rename, and remove client records from one place.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 px-0 pb-0">
        <form onSubmit={handleCreate} className="flex gap-2">
          <Input
            placeholder="New client name"
            value={newClientName}
            onChange={(e) => setNewClientName(e.target.value)}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={loading || !newClientName.trim()}
            className="gap-1 rounded-xl px-4"
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </form>

        <div className="max-h-72 space-y-2 overflow-y-auto px-2">
          {clients.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border-strong bg-bg-accent px-4 py-3 text-sm text-muted-strong">
              No clients yet. Add your first client above to get started.
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
                  <span className="mt-1 text-xs text-muted-strong">
                    {client.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleToggleActivity(client)}
                    disabled={loading}
                    className="gap-1 rounded-xl px-3"
                  >
                    {client.is_active ? (
                      <ToggleRight className="h-4 w-4" />
                    ) : (
                      <ToggleLeft className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setEditingClient(client)}
                    disabled={loading}
                    className="gap-1 rounded-xl px-3"
                  >
                    <PencilLine className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setDeletingClientId(client.id)}
                    disabled={loading}
                    className="gap-1 rounded-xl px-3"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
          title="Edit Client"
        >
          <div className="space-y-4 p-4">
            <Input
              placeholder="Client Name"
              value={editingClient.name}
              onChange={(e) =>
                setEditingClient({ ...editingClient, name: e.target.value })
              }
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setEditingClient(null)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={loading}
                className="rounded-xl"
              >
                Save Changes
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
          title="Delete Client"
        >
          <div className="space-y-4 p-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to delete this client? Deleting a client may
              fail if active projects or timesheet entries depend on it.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setDeletingClientId(null)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={loading}
                className="rounded-xl"
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
};
