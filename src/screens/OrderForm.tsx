import { useMemo, useState } from "react";
import type { Customer, NewOrderInput, Product } from "../types";
import { STRINGS } from "../lib/strings";
import { formatMoney } from "../lib/format";
import { Field, MoneyInput, Select, TextArea, TextInput } from "../forms/formFields";

type Props = {
  customers: Customer[];
  products: Product[];
  onSave: (input: NewOrderInput) => void | Promise<void>;
  onCancel: () => void;
};

const num = (raw: string): number => {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

export const OrderForm = ({ customers, products, onSave, onCancel }: Props) => {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [productId, setProductId] = useState("");
  const [productName, setProductName] = useState("");
  const [details, setDetails] = useState("");
  const [cost, setCost] = useState("");
  const [price, setPrice] = useState("");
  const [deposit, setDeposit] = useState("");
  const [promisedDate, setPromisedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const earned = num(price) - num(cost);
  const pending = Math.max(0, num(price) - num(deposit));
  const losing = earned < 0 && (price || cost);

  const listId = useMemo(() => "customers-list", []);

  const onPickProduct = (id: string) => {
    setProductId(id);
    const p = products.find((x) => x.id === id);
    if (p) {
      setProductName(p.name);
      setCost(String(p.referenceCost));
      setPrice(String(p.referencePrice));
    }
  };

  const submit = async () => {
    if (!customerName.trim()) return setError(STRINGS.orderForm.errCustomer);
    if (!productName.trim()) return setError(STRINGS.orderForm.errProduct);
    if (!price.trim() || num(price) <= 0) return setError(STRINGS.orderForm.errPrice);
    setError("");
    setBusy(true);
    try {
      await onSave({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        productId: productId || undefined,
        productName: productName.trim(),
        details,
        cost: num(cost),
        price: num(price),
        deposit: num(deposit),
        promisedDate: promisedDate || undefined,
        notes,
      });
      // On success the parent closes the form; clear busy defensively in case
      // the parent keeps the form mounted (e.g. onSave resolved but didn't unmount).
      setBusy(false);
    } catch (e) {
      // Keep entered values; surface error so the user can retry without retyping.
      // Include Firebase's code (e.g. "permission-denied") when present — the
      // generic message alone hides the real cause of save failures.
      const code = (e as { code?: string }).code;
      const msg = e instanceof Error && e.message ? e.message : STRINGS.errors.save;
      setError(code ? `${msg} (${code})` : msg);
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-900">{STRINGS.orderForm.title}</h2>

      <Field label={STRINGS.orderForm.customer}>
        <TextInput
          list={listId}
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder={STRINGS.orderForm.customerPlaceholder}
          autoComplete="off"
        />
        <datalist id={listId}>
          {customers.map((c) => (
            <option key={c.id} value={c.name} />
          ))}
        </datalist>
      </Field>

      <Field label={STRINGS.orderForm.phone}>
        <TextInput
          type="tel"
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          placeholder={STRINGS.orderForm.phonePlaceholder}
        />
      </Field>

      {products.length > 0 && (
        <Field label={STRINGS.orderForm.fromCatalog}>
          <Select
            value={productId}
            onChange={(e) => onPickProduct(e.target.value)}
          >
            <option value="">{STRINGS.orderForm.chooseProduct}</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <Field label={STRINGS.orderForm.productName}>
        <TextInput
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          placeholder={STRINGS.orderForm.productNamePlaceholder}
        />
      </Field>

      <Field label={STRINGS.orderForm.details}>
        <TextInput
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder={STRINGS.orderForm.detailsPlaceholder}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={STRINGS.orderForm.cost}>
          <MoneyInput value={cost} onChange={setCost} placeholder="$0" />
        </Field>
        <Field label={STRINGS.orderForm.price}>
          <MoneyInput value={price} onChange={setPrice} placeholder="$0" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label={STRINGS.orderForm.deposit}
          hint={deposit ? undefined : STRINGS.orderForm.depositHint}
        >
          <MoneyInput value={deposit} onChange={setDeposit} placeholder="$0" />
        </Field>
        <Field label={STRINGS.orderForm.promisedDate}>
          <TextInput
            type="date"
            value={promisedDate}
            onChange={(e) => setPromisedDate(e.target.value)}
          />
        </Field>
      </div>

      <Field label={STRINGS.orderForm.notes}>
        <TextArea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>

      {(price || deposit) && (
        <div
          className={`rounded-xl p-3 text-sm ${
            losing ? "bg-red-50" : "bg-emerald-50"
          }`}
        >
          <p className={losing ? "text-red-800" : "text-emerald-800"}>
            <span className="font-medium">
              {losing ? STRINGS.orderForm.losing : STRINGS.orderForm.willEarn}:{" "}
            </span>
            {formatMoney(earned)}
          </p>
          <p className={`mt-0.5 ${losing ? "text-red-700" : "text-emerald-700"}`}>
            <span className="font-medium">{STRINGS.orderForm.pendingAfter}: </span>
            {formatMoney(pending)}
          </p>
        </div>
      )}

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <div className="flex gap-3 pt-1">
        <button
          onClick={onCancel}
          disabled={busy}
          className="flex-1 rounded-xl border border-gray-300 bg-white py-3 text-base font-semibold text-gray-700 active:scale-[0.99] transition disabled:opacity-50"
        >
          {STRINGS.orderForm.cancel}
        </button>
        <button
          onClick={() => void submit()}
          disabled={busy}
          className="flex-[2] rounded-xl bg-emerald-600 py-3 text-base font-semibold text-white active:scale-[0.99] active:bg-emerald-700 transition disabled:opacity-60"
        >
          {busy ? STRINGS.orderForm.saving : STRINGS.orderForm.save}
        </button>
      </div>
    </div>
  );
};
