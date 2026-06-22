import type { Tab } from "../types";
import { STRINGS } from "../lib/strings";

type Props = {
  tab: Tab;
  onChange: (tab: Tab) => void;
};

const TABS: { key: Tab; emoji: string }[] = [
  { key: "home", emoji: "🏠" },
  { key: "catalog", emoji: "🏷️" },
  { key: "orders", emoji: "📋" },
  { key: "customers", emoji: "👥" },
];

// Fixed bottom bar, 4 equal targets, safe-area aware.
export const BottomNav = ({ tab, onChange }: Props) => (
  <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white/95 backdrop-blur">
    <div
      className="mx-auto flex max-w-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {TABS.map(({ key, emoji }) => {
        const active = tab === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={[
              "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition",
              active ? "text-emerald-600" : "text-gray-400",
            ].join(" ")}
          >
            <span className="text-xl leading-none">{emoji}</span>
            {STRINGS.nav[key]}
          </button>
        );
      })}
    </div>
  </nav>
);
