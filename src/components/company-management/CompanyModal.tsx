import React from "react";
import { useTranslation } from "react-i18next";
import type { Company } from "../../types/company";
import { Button } from "../shared/Button";
import { Checkbox } from "../shared/Checkbox";
import { Input } from "../shared/Input";
import { Modal } from "../shared/Modal";

export interface CompanyFormData {
  name: string;
  billing_email: string;
  szamlazz_test_mode: boolean;
  is_active: boolean;
}

interface CompanyModalProps {
  isOpen: boolean;
  editingCompany: Company | null;
  formData: CompanyFormData;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (changes: Partial<CompanyFormData>) => void;
}

export const CompanyModal: React.FC<CompanyModalProps> = ({
  isOpen,
  editingCompany,
  formData,
  onClose,
  onSubmit,
  onChange,
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      className="max-w-md"
      title={editingCompany
        ? t("companyManagement.editCompanyTitle")
        : t("companyManagement.createNewCompany")}
    >
        <form onSubmit={onSubmit} className="space-y-5 overflow-y-auto p-5 sm:p-6">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              {t("companyManagement.companyName")}
            </label>
            <Input
              type="text"
              required
              value={formData.name}
              onChange={(e) => onChange({ name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              {t("companyManagement.billingEmail")}
            </label>
            <Input
              type="email"
              value={formData.billing_email}
              onChange={(e) => onChange({ billing_email: e.target.value })}
            />
          </div>
          <div className="rounded-xl border border-border bg-bg-accent/60 p-4">
            <Checkbox
              id="szamlazz_test_mode_check"
              checked={formData.szamlazz_test_mode}
              onChange={(e) =>
                onChange({ szamlazz_test_mode: e.target.checked })
              }
              label={t("companyManagement.szamlazzTestMode")}
            />
          </div>
          <div className="rounded-xl border border-border bg-bg-accent/60 p-4">
            <Checkbox
              id="is_active_check"
              checked={formData.is_active}
              onChange={(e) => onChange({ is_active: e.target.checked })}
              label={t("companyManagement.companyActive")}
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-5">
            <Button
              type="button"
              onClick={onClose}
              variant="ghost"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
            >
              {editingCompany
                ? t("companyManagement.saveChanges")
                : t("companyManagement.createCompany")}
            </Button>
          </div>
        </form>
    </Modal>
  );
};
