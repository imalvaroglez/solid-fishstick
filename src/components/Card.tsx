import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
};

// Rounded white surface with soft gray border. Apple-Wallet-ish card.
export const Card = ({ children, className = "", onClick }: Props) => (
  <div
    onClick={onClick}
    className={[
      "rounded-2xl border border-gray-200 bg-white p-4 shadow-sm",
      onClick ? "active:scale-[0.99] transition" : "",
      className,
    ].join(" ")}
  >
    {children}
  </div>
);
