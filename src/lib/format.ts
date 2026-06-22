// Formatting helpers. Mexican peso + Spanish (MX) dates. No i18n framework.

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

// $2,700 — integer pesos, comma thousands, no decimals, no currency code.
export const formatMoney = (n: number): string =>
  "$" + Math.round(n).toLocaleString("en-US");

const startOfDay = (d: string | number | Date): number => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
};

const dayDiff = (a: string | number | Date, b: string | number | Date): number =>
  Math.round((startOfDay(b) - startOfDay(a)) / 86_400_000);

// "15 de julio", with "Hoy" / "Ayer" / "Mañana" for ±1 day.
export const formatDate = (input: string | number | Date): string => {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  const diff = dayDiff(new Date(), date);
  if (diff === 0) return "Hoy";
  if (diff === -1) return "Ayer";
  if (diff === 1) return "Mañana";
  return `${date.getDate()} de ${MONTHS[date.getMonth()]}`;
};
