import { useEffect } from "react";

// Minimal bottom toast, auto-hides. Optional action button (e.g. Deshacer)
// extends the timeout so the user has time to tap it.
export const Toast = ({
  message,
  actionLabel,
  onAction,
  onDone,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDone: () => void;
}) => {
  useEffect(() => {
    const t = setTimeout(onDone, actionLabel ? 4500 : 2500);
    return () => clearTimeout(t);
  }, [onDone, actionLabel]);

  return (
    <div className="fixed inset-x-0 bottom-24 z-50 flex justify-center px-4">
      <div className="flex items-center gap-3 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg">
        <span>{message}</span>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="-mr-1 rounded-full bg-white/15 px-3 py-1 font-semibold text-white active:scale-[0.97] transition"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
};
