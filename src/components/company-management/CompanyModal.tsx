import React from "react";
import type { Company } from "../../types/company";

export interface CompanyFormData {
  name: string;
  billing_email: string;
  szamlazz_token: string;
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
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl border border-outline">
        <h2 className="text-xl font-bold mb-4">
          {editingCompany ? "Edit Company" : "Create New Company"}
        </h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Company Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => onChange({ name: e.target.value })}
              className="w-full border border-outline rounded p-2 text-sm focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Billing Email
            </label>
            <input
              type="email"
              value={formData.billing_email}
              onChange={(e) => onChange({ billing_email: e.target.value })}
              className="w-full border border-outline rounded p-2 text-sm focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Számlázz.hu API Token
            </label>
            <input
              type="password"
              value={formData.szamlazz_token}
              onChange={(e) => onChange({ szamlazz_token: e.target.value })}
              className="w-full border border-outline rounded p-2 text-sm focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_active_check"
              checked={formData.is_active}
              onChange={(e) => onChange({ is_active: e.target.checked })}
              className="rounded text-primary focus:ring-primary"
            />
            <label htmlFor="is_active_check" className="text-sm font-medium text-slate-700">
              Company Active
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-container text-on-primary-container rounded text-sm font-bold hover:shadow"
            >
              {editingCompany ? "Save Changes" : "Create Company"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
