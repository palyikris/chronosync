// src/pages/CompanyManagementPage.tsx
import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CompanyManagementHeader } from "../components/company-management/CompanyManagementHeader";
import { CompanyManagementSidebar } from "../components/company-management/CompanyManagementSidebar";
import { CompanyModal } from "../components/company-management/CompanyModal";
import { CompanyTable } from "../components/company-management/CompanyTable";
import { companyService } from "../services/companyService";
import type { Company } from "../types/company";
import type { CompanyFormData } from "../components/company-management/CompanyModal";

const companyQueryKey = ["companies"];

export const CompanyManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterActiveOnly, setFilterActiveOnly] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState<CompanyFormData>({
    name: "",
    billing_email: "",
    szamlazz_token: "",
    is_active: true,
  });

  const {
    data: companies = [],
    isLoading: loading,
  } = useQuery({
    queryKey: companyQueryKey,
    queryFn: companyService.getCompanies,
  });

  const invalidateCompanies = async () => {
    await queryClient.invalidateQueries({ queryKey: companyQueryKey });
  };

  const handleMutationError = (error: unknown, fallback: string) => {
    alert(error instanceof Error ? error.message : fallback);
  };

  const createCompanyMutation = useMutation({
    mutationFn: companyService.createCompany,
    onSuccess: async () => {
      await invalidateCompanies();
      setIsModalOpen(false);
    },
    onError: (error) => handleMutationError(error, "Operation failed"),
  });

  const updateCompanyMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: CompanyFormData }) =>
      companyService.updateCompany(id, {
        name: input.name.trim(),
        billing_email: input.billing_email.trim() || null,
        szamlazz_token: input.szamlazz_token.trim() || null,
        is_active: input.is_active,
      }),
    onSuccess: async () => {
      await invalidateCompanies();
      setIsModalOpen(false);
    },
    onError: (error) => handleMutationError(error, "Operation failed"),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      companyService.toggleActiveStatus(id, isActive),
    onSuccess: async () => {
      await invalidateCompanies();
    },
    onError: (error) => handleMutationError(error, "Failed to change status"),
  });

  const softDeleteMutation = useMutation({
    mutationFn: (id: string) => companyService.softDeleteCompany(id),
    onSuccess: async () => {
      await invalidateCompanies();
    },
    onError: (error) => handleMutationError(error, "Failed to soft delete"),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => companyService.restoreCompany(id),
    onSuccess: async () => {
      await invalidateCompanies();
    },
    onError: (error) => handleMutationError(error, "Failed to restore company"),
  });

  const hardDeleteMutation = useMutation({
    mutationFn: (id: string) => companyService.hardDeleteCompany(id),
    onSuccess: async () => {
      await invalidateCompanies();
    },
    onError: (error) => handleMutationError(error, "Failed to purge company"),
  });

  const handleOpenCreateModal = () => {
    setEditingCompany(null);
    setFormData({
      name: "",
      billing_email: "",
      szamlazz_token: "",
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const handleFormChange = (changes: Partial<CompanyFormData>) => {
    setFormData((prev) => ({ ...prev, ...changes }));
  };

  const handleOpenEditModal = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      billing_email: company.billing_email || "",
      szamlazz_token: company.szamlazz_token || "",
      is_active: company.is_active,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      if (editingCompany) {
        await updateCompanyMutation.mutateAsync({
          id: editingCompany.id,
          input: formData,
        });
      } else {
        await createCompanyMutation.mutateAsync({
          name: formData.name.trim(),
          billing_email: formData.billing_email.trim() || undefined,
          szamlazz_token: formData.szamlazz_token.trim() || undefined,
          is_active: formData.is_active,
        });
      }
    } catch {
      // Errors are handled by the mutation's onError hook.
    }
  };

  const handleToggleActive = async (company: Company) => {
    try {
      await toggleActiveMutation.mutateAsync({
        id: company.id,
        isActive: !company.is_active,
      });
    } catch {
      // Errors are handled by the mutation's onError hook.
    }
  };

  const handleSoftDelete = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to soft delete this company? Active users will be locked out.",
      )
    )
      return;
    try {
      await softDeleteMutation.mutateAsync(id);
    } catch {
      // Errors are handled by the mutation's onError hook.
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreMutation.mutateAsync(id);
    } catch {
      // Errors are handled by the mutation's onError hook.
    }
  };

  const handleHardDelete = async (id: string) => {
    if (
      !confirm(
        "PERMANENT ACTION: Are you sure you want to permanently purge this company record?",
      )
    )
      return;
    try {
      await hardDeleteMutation.mutateAsync(id);
    } catch {
      // Errors are handled by the mutation's onError hook.
    }
  };

  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.billing_email &&
          c.billing_email.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesFilter = filterActiveOnly
        ? c.is_active && !c.is_deleted
        : true;
      return matchesSearch && matchesFilter;
    });
  }, [companies, filterActiveOnly, searchQuery]);

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col">
      <CompanyManagementHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterActiveOnly={filterActiveOnly}
        onFilterToggle={() => setFilterActiveOnly((prev) => !prev)}
      />

      <div className="flex flex-1">
        <CompanyManagementSidebar />

        <main className="flex-1 ml-20 p-8 bg-surface-canvas">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h1 className="text-3xl font-normal text-on-surface mb-2">
                  Company Directory
                </h1>
                <p className="text-sm text-secondary">
                  Manage enterprise tenants, billing integrations, and status.
                </p>
              </div>
            </div>

            <CompanyTable
              loading={loading}
              filteredCompanies={filteredCompanies}
              onToggleActive={handleToggleActive}
              onEdit={handleOpenEditModal}
              onSoftDelete={handleSoftDelete}
              onRestore={handleRestore}
              onHardDelete={handleHardDelete}
            />
          </div>
        </main>
      </div>

      <button
        onClick={handleOpenCreateModal}
        className="fixed bottom-8 right-8 bg-primary text-on-primary-container hover:shadow-lg transition-all flex items-center gap-3 px-6 py-4 rounded-xl active:scale-95 z-50 font-bold"
      >
        <span className="material-symbols-outlined font-bold">add</span>
        <span>Add Company</span>
      </button>

      <CompanyModal
        isOpen={isModalOpen}
        editingCompany={editingCompany}
        formData={formData}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSave}
        onChange={handleFormChange}
      />
    </div>
  );
};
