import { useState } from "react";
import { STRINGS } from "../lib/strings";
import { Card } from "./Card";

type Store = {
  hasLocalData: boolean;
  importLocalData: () => Promise<void>;
  importSampleData: () => Promise<void>;
};

// Shown only when Firestore is empty. Non-destructive import.
export const MigrationBanner = ({ store }: { store: Store }) => {
  const [busy, setBusy] = useState<"" | "local" | "sample">("");
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const run = async (which: "local" | "sample") => {
    setBusy(which);
    try {
      await (which === "local" ? store.importLocalData() : store.importSampleData());
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="px-4 pt-4">
      <Card className="bg-amber-50 border-amber-200">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-amber-900">
              {STRINGS.migration.bannerTitle}
            </p>
            <p className="mt-0.5 text-sm text-amber-700">
              {STRINGS.migration.bannerBody}
            </p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="shrink-0 text-amber-400 active:text-amber-600"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-2">
          <button
            onClick={() => run("local")}
            disabled={!store.hasLocalData || busy !== ""}
            className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white active:scale-[0.99] transition disabled:opacity-50"
          >
            {busy === "local"
              ? STRINGS.migration.importing
              : STRINGS.migration.importLocal}
          </button>
          {!store.hasLocalData && (
            <p className="text-xs text-amber-600">{STRINGS.migration.noLocal}</p>
          )}
          <button
            onClick={() => run("sample")}
            disabled={busy !== ""}
            className="rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-semibold text-amber-700 active:scale-[0.99] transition disabled:opacity-50"
          >
            {busy === "sample"
              ? STRINGS.migration.importing
              : STRINGS.migration.importSample}
          </button>
        </div>
      </Card>
    </div>
  );
};
