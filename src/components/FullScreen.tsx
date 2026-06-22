import type { ReactNode } from "react";

// Tiny centered full-screen message (loading / error).
export const FullScreen = ({
  text,
  children,
}: {
  text: string;
  children?: ReactNode;
}) => (
  <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
    <div className="mb-3 text-3xl">⏳</div>
    <p className="text-base font-medium text-gray-700">{text}</p>
    {children}
  </div>
);
