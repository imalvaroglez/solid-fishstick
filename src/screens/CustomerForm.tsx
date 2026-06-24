import { useState } from "react";
import type { Customer } from "../types";
import { STRINGS } from "../lib/strings";
import { Field, TextArea, TextInput } from "../forms/formFields";

type Props = {
  onSave: (
    customer: Pick<Customer, "name" | "phone" | "notes">
  ) => void | Promise<void>;
  onCancel: () => void;
};

export const CustomerForm = ({ onSave, onCancel }: Props) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) return setError(STRINGS.customerForm.errName);
    setBusy(true);
    setError("");
    try {
      await onSave({
        name: name.trim(),
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    } catch {
      setError(STRINGS.errors.save);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-900">{STRINGS.customerForm.title}</h2>

      <Field label={STRINGS.customerForm.name}>
        <TextInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={STRINGS.customerForm.namePlaceholder}
          autoFocus
        />
      </Field>

      <Field label={STRINGS.customerForm.phone}>
        <TextInput
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="55 1234 5678"
        />
      </Field>

      <Field label={STRINGS.customerForm.notes}>
        <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <div className="flex gap-3 pt-1">
        <button
          onClick={onCancel}
          disabled={busy}
          className="flex-1 rounded-xl border border-gray-300 bg-white py-3 text-base font-semibold text-gray-700 active:scale-[0.99] transition"
        >
          {STRINGS.customerForm.cancel}
        </button>
        <button
          onClick={() => void submit()}
          disabled={busy}
          className="flex-[2] rounded-xl bg-emerald-600 py-3 text-base font-semibold text-white active:scale-[0.99] transition"
        >
          {busy ? "Guardando..." : STRINGS.customerForm.save}
        </button>
      </div>
    </div>
  );
};
