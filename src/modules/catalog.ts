export const MODULES = {
  leave_attachments: { requires: [] },
  invoicing: { requires: ["leave_attachments"] },
} as const;

export type ModuleId = keyof typeof MODULES;

export function isModuleEnabled(enabled: readonly string[] | undefined, module: ModuleId): boolean {
  return Boolean(enabled?.includes(module)) &&
    MODULES[module].requires.every(required => enabled?.includes(required));
}

export function toggleModule(enabled: readonly ModuleId[], module: ModuleId, checked: boolean): ModuleId[] {
  const next = new Set(enabled);
  if (checked) {
    next.add(module);
    MODULES[module].requires.forEach(required => next.add(required));
  } else {
    next.delete(module);
    for (const dependent of Object.keys(MODULES) as ModuleId[]) {
      if (!isModuleEnabled([...next], dependent)) next.delete(dependent);
    }
  }
  return [...next];
}

export const MODULE_ROUTES: Record<string, ModuleId> = {
  "/leaves": "leave_attachments",
  "/admin/invoice-attachments": "leave_attachments",
  "/admin/billing": "invoicing",
};
