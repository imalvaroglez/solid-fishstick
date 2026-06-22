import { formatMoney } from "../lib/format";

type Props = {
  value: number;
  className?: string;
};

export const Money = ({ value, className = "" }: Props) => (
  <span className={className}>{formatMoney(value)}</span>
);
