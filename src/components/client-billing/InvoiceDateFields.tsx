import { useTranslation } from "react-i18next";
import { Input } from "../shared/Input";

interface Props {
  dueDate: string;
  fulfillmentDate: string;
  onDueChange: (value: string) => void;
  onFulfillmentChange: (value: string) => void;
  issueDate?: string;
  disabled?: boolean;
  required?: boolean;
}

export function InvoiceDateFields({ dueDate, fulfillmentDate, onDueChange, onFulfillmentChange,
  issueDate, disabled = false, required = false }: Props) {
  const { t } = useTranslation();
  return <div className="grid gap-3 sm:grid-cols-2">
    <Input type="date" label={t("clientBilling.terms.fulfillmentDate")} value={fulfillmentDate}
      disabled={disabled} required={required} onChange={event => onFulfillmentChange(event.target.value)} />
    <Input type="date" label={t("clientBilling.terms.dueDate")} value={dueDate} min={issueDate}
      disabled={disabled} required={required} onChange={event => onDueChange(event.target.value)} />
  </div>;
}
