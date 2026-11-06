import { useId, useRef, useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import { usePopoverDismiss } from "../../hooks/usePopoverDismiss";
import { PopoverPanel } from "./PopoverPanel";

export function InfoPopover({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  usePopoverDismiss(open, root, trigger, () => setOpen(false));

  return (
    <div ref={root} className="inline-flex shrink-0">
      <button
        ref={trigger}
        id={`${id}-trigger`}
        type="button"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen(current => !current)}
        className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-primary/10 hover:text-primary-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
      >
        <Info className="h-4 w-4" aria-hidden="true" />
      </button>
      {open ? (
        <PopoverPanel trigger={trigger} id={id} title={label} width={360}>
          <div className="space-y-2 text-xs leading-5 text-muted-strong">{children}</div>
        </PopoverPanel>
      ) : null}
    </div>
  );
}
