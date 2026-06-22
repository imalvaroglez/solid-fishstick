import type { ReactNode } from "react";

export const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-3.5 py-3 text-base text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 placeholder:text-gray-400";

// Label + control wrapper.
export const Field = ({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: ReactNode;
}) => (
  <label className="block">
    <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-sm text-gray-500">{hint}</span>}
  </label>
);

export const TextInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input className={inputClass} {...props} />
);

// Numeric money input: keeps a string value, reports parsed number.
export const MoneyInput = ({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (raw: string) => void;
  placeholder?: string;
}) => (
  <input
    type="number"
    inputMode="decimal"
    min={0}
    className={inputClass}
    value={value}
    placeholder={placeholder}
    onChange={(e) => onChange(e.target.value)}
  />
);

export const TextArea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className={inputClass} rows={2} {...props} />
);

export const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className={inputClass} {...props} />
);
