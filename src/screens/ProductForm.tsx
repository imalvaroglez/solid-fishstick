import { useRef, useState } from "react";
import type { Product, ProductCategory } from "../types";
import { STRINGS } from "../lib/strings";
import { id } from "../lib/ids";
import { Field, MoneyInput, Select, TextArea, TextInput } from "../forms/formFields";
import { ImagePicker } from "../components/ImagePicker";
import { uploadProductImage } from "../services/firebase/storage";

type Props = {
  initial?: Product | null;
  onSave: (product: Product) => void | Promise<void>;
  onCancel: () => void;
};

const num = (raw: string): number => {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

const CATS: ProductCategory[] = ["perfume", "sneakers", "cap", "other"];

export const ProductForm = ({ initial, onSave, onCancel }: Props) => {
  // Stable id: reuse existing product id when editing, else generate once.
  const productIdRef = useRef<string>(initial?.id ?? id());

  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState<ProductCategory>(
    initial?.category ?? "perfume"
  );
  const [cost, setCost] = useState(initial ? String(initial.referenceCost) : "");
  const [price, setPrice] = useState(initial ? String(initial.referencePrice) : "");
  const imageUrl = initial?.imageUrl;
  const imagePath = initial?.imagePath;
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [publicDescription, setPublicDescription] = useState(
    initial?.publicDescription ?? ""
  );
  const [privateNotes, setPrivateNotes] = useState(initial?.privateNotes ?? "");
  const [isPublic, setIsPublic] = useState(initial?.isPublic ?? false);
  const notes = initial?.notes ?? "";
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) return setError(STRINGS.productForm.errName);
    if (!price.trim() || num(price) <= 0) return setError(STRINGS.productForm.errPrice);
    setError("");
    setBusy(true);
    try {
      let finalImageUrl = imageUrl;
      let finalImagePath = imagePath;
      if (pendingFile) {
        const uploaded = await uploadProductImage(pendingFile, productIdRef.current);
        finalImageUrl = uploaded.imageUrl;
        finalImagePath = uploaded.imagePath;
      }
      const ts = new Date().toISOString();
      await onSave({
        id: productIdRef.current,
        name: name.trim(),
        category,
        referenceCost: num(cost),
        referencePrice: num(price),
        imageUrl: finalImageUrl,
        imagePath: finalImagePath,
        publicDescription: publicDescription.trim() || undefined,
        privateNotes: privateNotes.trim() || undefined,
        isPublic,
        notes: notes.trim() || undefined,
        createdAt: initial?.createdAt ?? ts,
        updatedAt: ts,
      });
    } catch {
      setError(STRINGS.image.uploadFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-900">
        {initial ? STRINGS.productForm.editTitle : STRINGS.productForm.title}
      </h2>

      <Field label={STRINGS.productForm.image}>
        <ImagePicker
          productId={productIdRef.current}
          initialImageUrl={imageUrl}
          onFileChange={setPendingFile}
          disabled={busy}
        />
      </Field>

      <Field label={STRINGS.productForm.name}>
        <TextInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={STRINGS.productForm.namePlaceholder}
          autoFocus
        />
      </Field>

      <Field label={STRINGS.productForm.category}>
        <Select
          value={category}
          onChange={(e) => setCategory(e.target.value as ProductCategory)}
        >
          {CATS.map((c) => (
            <option key={c} value={c}>
              {STRINGS.categories[c]}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={STRINGS.productForm.referenceCost}>
          <MoneyInput value={cost} onChange={setCost} placeholder="$0" />
        </Field>
        <Field label={STRINGS.productForm.referencePrice}>
          <MoneyInput value={price} onChange={setPrice} placeholder="$0" />
        </Field>
      </div>

      <Field label={STRINGS.productForm.publicDescription}>
        <TextArea
          value={publicDescription}
          onChange={(e) => setPublicDescription(e.target.value)}
          placeholder={STRINGS.productForm.publicDescriptionPlaceholder}
        />
      </Field>

      <Field label={STRINGS.productForm.privateNotes}>
        <TextArea value={privateNotes} onChange={(e) => setPrivateNotes(e.target.value)} />
      </Field>

      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-white p-3.5">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="h-5 w-5 rounded accent-emerald-600"
        />
        <span className="text-sm font-medium text-gray-800">
          {STRINGS.catalog.showInPublic}
        </span>
      </label>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <div className="flex gap-3 pt-1">
        <button
          onClick={onCancel}
          disabled={busy}
          className="flex-1 rounded-xl border border-gray-300 bg-white py-3 text-base font-semibold text-gray-700 active:scale-[0.99] transition disabled:opacity-50"
        >
          {STRINGS.productForm.cancel}
        </button>
        <button
          onClick={() => void submit()}
          disabled={busy}
          className="flex-[2] rounded-xl bg-emerald-600 py-3 text-base font-semibold text-white active:scale-[0.99] transition disabled:opacity-60"
        >
          {busy ? STRINGS.image.uploading : STRINGS.productForm.save}
        </button>
      </div>
    </div>
  );
};
