import { useState } from "react";
import { createRoot } from "react-dom/client";
import "../../src/index.css";
import i18n from "../../src/lib/i18n";
import { Modal } from "../../src/components/shared/Modal";
import { Select } from "../../src/components/shared/Select";
import { Input } from "../../src/components/shared/Input";
import { Button } from "../../src/components/shared/Button";
void i18n.changeLanguage("en");

export function Harness() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [submits, setSubmits] = useState(0);
  return <main className="p-5">
    <Button onClick={() => setOpen(true)}>Open form</Button>
    <output data-testid="submits">{submits}</output>
    <Modal open={open} title="Test form" onClose={() => setOpen(false)} className="max-w-lg">
      <form onSubmit={e => { e.preventDefault(); setSubmits(n => n + 1); }} className="space-y-4 p-5">
        <Input label="Name" defaultValue="Example" />
        <Select label="Client" required value={value} onChange={e => setValue(e.target.value)}>
          <option value="">Choose a client</option>
          {Array.from({ length: 40 }, (_, index) => <option key={index} value={String(index + 1)}>Client {String(index + 1).padStart(2, "0")}</option>)}
        </Select>
        <div className="h-[650px]">Long form content</div>
        <Button type="submit">Save test</Button>
      </form>
    </Modal>
  </main>;
}
createRoot(document.getElementById("root")!).render(<Harness />);
