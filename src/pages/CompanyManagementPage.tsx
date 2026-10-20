// src/pages/CompanyManagementPage.tsx
import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CompanyManagementHeader } from "../components/company-management/CompanyManagementHeader";
import { CompanyModal } from "../components/company-management/CompanyModal";
import { CompanyTable } from "../components/company-management/CompanyTable";
import { companyService } from "../services/companyService";
import type { Company } from "../types/company";
import type { CompanyFormData } from "../components/company-management/CompanyModal";

const companyQueryKey = ["companies"];

export const CompanyManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterActiveOnly, setFilterActiveOnly] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState<CompanyFormData>({
    name: "",
    billing_email: "",
    szamlazz_test_mode: true,
    is_active: true,
  });

  const { data: companies = [], isLoading: loading } = useQuery({
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
    onError: (error) =>
      handleMutationError(error, t("companyManagement.operationFailed")),
  });

  const updateCompanyMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: CompanyFormData }) =>
      companyService.updateCompany(id, {
        name: input.name.trim(),
        billing_email: input.billing_email.trim() || null,
        szamlazz_test_mode: input.szamlazz_test_mode,
        is_active: input.is_active,
      }),
    onSuccess: async () => {
      await invalidateCompanies();
      setIsModalOpen(false);
    },
    onError: (error) =>
      handleMutationError(error, t("companyManagement.operationFailed")),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      companyService.toggleActiveStatus(id, isActive),
    onSuccess: async () => {
      await invalidateCompanies();
    },
    onError: (error) =>
      handleMutationError(error, t("companyManagement.failedChangeStatus")),
  });

  const softDeleteMutation = useMutation({
    mutationFn: (id: string) => companyService.softDeleteCompany(id),
    onSuccess: async () => {
      await invalidateCompanies();
    },
    onError: (error) =>
      handleMutationError(error, t("companyManagement.failedSoftDelete")),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => companyService.restoreCompany(id),
    onSuccess: async () => {
      await invalidateCompanies();
    },
    onError: (error) =>
      handleMutationError(error, t("companyManagement.failedRestore")),
  });

  const hardDeleteMutation = useMutation({
    mutationFn: (id: string) => companyService.hardDeleteCompany(id),
    onSuccess: async () => {
      await invalidateCompanies();
    },
    onError: (error) =>
      handleMutationError(error, t("companyManagement.failedPurge")),
  });

  const handleOpenCreateModal = () => {
    setEditingCompany(null);
    setFormData({
      name: "",
      billing_email: "",
      szamlazz_test_mode: true,
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
      szamlazz_test_mode: company.szamlazz_test_mode,
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
          szamlazz_test_mode: formData.szamlazz_test_mode,
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
    if (!confirm(t("companyManagement.confirmSoftDelete"))) return;
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
    if (!confirm(t("companyManagement.confirmHardDelete"))) return;
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
    <div className="space-y-6 pb-10">
      <CompanyManagementHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterActiveOnly={filterActiveOnly}
        onFilterToggle={() => setFilterActiveOnly((prev) => !prev)}
        onAddClick={handleOpenCreateModal}
      />

      <CompanyTable
        loading={loading}
        filteredCompanies={filteredCompanies}
        onToggleActive={handleToggleActive}
        onEdit={handleOpenEditModal}
        onSoftDelete={handleSoftDelete}
        onRestore={handleRestore}
        onHardDelete={handleHardDelete}
      />

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
