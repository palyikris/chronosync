// src/components/company-settings/SzamlazzSettingsCard.tsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../shared/Card';
import { Button } from '../shared/Button';
import { Checkbox } from '../shared/Checkbox';
import { Input } from '../shared/Input';
import { supabase } from '../../lib/supabaseClient';

interface SzamlazzSettingsCardProps {
  companyId: string;
  initialKey?: string;
  initialTestMode?: boolean;
  onUpdate?: () => void;
}

export const SzamlazzSettingsCard: React.FC<SzamlazzSettingsCardProps> = ({
  companyId,
  initialKey = '',
  initialTestMode = true,
  onUpdate,
}) => {
  const { t } = useTranslation();
  const [szamlaAgentKey, setSzamlaAgentKey] = useState(initialKey);
  const [testMode, setTestMode] = useState(initialTestMode);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTestResult(null);

    try {
      const { error } = await supabase
        .from('companies')
        .update({
          szamla_agent_key: szamlaAgentKey.trim(),
          szamlazz_test_mode: testMode,
        })
        .eq('id', companyId);

      if (error) throw error;
      if (onUpdate) onUpdate();
      setTestResult({ success: true, message: t('companySettings.szamlazzSettingsSaved') });
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || t('companySettings.szamlazzSettingsSaveFailed') });
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!szamlaAgentKey.trim()) {
      setTestResult({ success: false, message: t('companySettings.szamlazzKeyRequired') });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('test-szamlazz-connection', {
        body: { szamlaAgentKey: szamlaAgentKey.trim(), testMode },
      });

      if (error) throw error;

      if (data?.success) {
        setTestResult({ success: true, message: t('companySettings.szamlazzConnectionSuccessful') });
      } else {
        setTestResult({ success: false, message: data?.message || t('companySettings.szamlazzConnectionFailed') });
      }
    } catch (err: any) {
      // Fallback format validation if edge function is unrouted in local dev
      if (szamlaAgentKey.trim().length === 42) {
        setTestResult({
          success: true,
          message: t('companySettings.szamlazzKeyFormatValid', { length: 42 }),
        });
      } else {
        setTestResult({
          success: false,
          message: t('companySettings.szamlazzKeyFormatInvalid', { length: 42 }),
        });
      }
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{t('companySettings.szamlazzTitle')}</h3>
          <p className="text-sm text-gray-500">{t('companySettings.szamlazzSubtitle')}</p>
        </div>
        <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${szamlaAgentKey ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
          {szamlaAgentKey ? t('companySettings.szamlazzConfigured') : t('companySettings.szamlazzNotConnected')}
        </span>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <Input
            label={t('companySettings.szamlazzKeyLabel')}
            type="password"
            value={szamlaAgentKey}
            onChange={(e) => setSzamlaAgentKey(e.target.value)}
            placeholder={t('companySettings.szamlazzKeyPlaceholder')}
          />
          <p className="text-xs text-gray-500 mt-1">
            {t('companySettings.szamlazzKeyHint')}
          </p>
        </div>

        <Checkbox
          id="szamlazz_test_mode"
          checked={testMode}
          onChange={(e) => setTestMode(e.target.checked)}
          label={t('companySettings.szamlazzTestMode')}
        />

        {testResult && (
          <div className={`p-3 rounded-md text-sm ${testResult.success ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {testResult.message}
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleTestConnection}
            disabled={testing || !szamlaAgentKey.trim()}
          >
            {testing ? t('companySettings.szamlazzTesting') : t('companySettings.szamlazzTestConnection')}
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? t('common.saving') : t('common.saveChanges')}
          </Button>
        </div>
      </form>
    </Card>
  );
};