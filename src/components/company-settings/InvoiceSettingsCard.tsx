import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "../shared/Card";
import { Button } from "../shared/Button";
import { Checkbox } from "../shared/Checkbox";
import { Input } from "../shared/Input";
import { Select } from "../shared/Select";
import {
  invoiceApiKeySchema,
  invoiceProviderSchema,
} from "../../lib/zodSchemas";
import { companyService } from "../../services/companyService";
import type {
  InvoiceProvider,
  InvoiceSettings,
} from "../../types/company-settings";

interface InvoiceSettingsCardProps {
  companyId: string;
  settings?: InvoiceSettings;
  initialTestMode?: boolean;
  onUpdate?: () => void;
}

export const InvoiceSettingsCard: React.FC<InvoiceSettingsCardProps> = ({
  companyId,
  settings,
  initialTestMode = true,
  onUpdate,
}) => {
  const { t } = useTranslation();
  const [provider, setProvider] = useState<InvoiceProvider>(
    settings?.invoice_provider ?? "szamlazz_hu",
  );
  const [apiKey, setApiKey] = useState("");
  const [keyConfigured, setKeyConfigured] = useState(
    settings?.api_key_configured ?? false,
  );
  const [testMode, setTestMode] = useState(initialTestMode);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleProviderChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setProvider(event.target.value as InvoiceProvider);
    setResult(null);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const providerValidation = invoiceProviderSchema.safeParse(provider);
      if (!providerValidation.success) {
        throw new Error(t("companySettings.invoiceProviderRequired"));
      }

      const trimmedKey = apiKey.trim();
      if (trimmedKey) {
        const keyValidation = invoiceApiKeySchema.safeParse(trimmedKey);
        if (!keyValidation.success) {
          throw new Error(
            keyValidation.error.issues[0]?.message ||
              t("companySettings.invoiceSettingsSaveFailed"),
          );
        }
      }

      const savedSettings = await companyService.updateInvoiceSettings(
        companyId,
        provider,
        trimmedKey || undefined,
        provider === "szamlazz_hu" ? testMode : undefined,
      );

      setProvider(savedSettings.invoice_provider);
      setKeyConfigured(savedSettings.api_key_configured);
      setApiKey("");
      onUpdate?.();
      setResult({
        success: true,
        message: t("companySettings.invoiceSettingsSaved"),
      });
    } catch (error: unknown) {
      setResult({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : t("companySettings.invoiceSettingsSaveFailed"),
      });
    } finally {
      setLoading(false);
    }
  };

  const providerLabel =
    provider === "billingo"
      ? t("companySettings.billingo")
      : t("companySettings.szamlazzHu");

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            {t("companySettings.invoiceSettingsTitle")}
          </h3>
          <p className="text-sm text-gray-500">
            {t("companySettings.invoiceSettingsSubtitle")}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${keyConfigured ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}
        >
          {keyConfigured
            ? t("companySettings.invoiceConfigured")
            : t("companySettings.invoiceNotConnected")}
        </span>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <Select
          label={t("companySettings.invoiceProviderLabel")}
          value={provider}
          onChange={handleProviderChange}
        >
          <option value="szamlazz_hu">{t("companySettings.szamlazzHu")}</option>
          <option value="billingo">{t("companySettings.billingo")}</option>
        </Select>

        <div>
          <Input
            label={t("companySettings.invoiceApiKeyLabel")}
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder={t("companySettings.invoiceApiKeyPlaceholder")}
            autoComplete="new-password"
          />
          <p className="mt-1 text-xs text-gray-500">
            {t("companySettings.invoiceApiKeyHint", { provider: providerLabel })}
          </p>
        </div>

        {provider === "szamlazz_hu" && (
          <Checkbox
            id="szamlazz_test_mode"
            checked={testMode}
            onChange={(event) => setTestMode(event.target.checked)}
            label={t("companySettings.szamlazzTestMode")}
          />
        )}

        {result && (
          <div
            className={`rounded-md border p-3 text-sm ${result.success ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"}`}
          >
            {result.message}
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-2">
          <Button type="submit" disabled={loading}>
            {loading ? t("common.saving") : t("common.saveChanges")}
          </Button>
        </div>
      </form>
    </Card>
  );
};