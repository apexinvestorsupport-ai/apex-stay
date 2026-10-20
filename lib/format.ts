export function money(value: number | string, currency = "USD", format: "whole" | "precise" = "whole") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: format === "whole" ? 0 : 2,
  }).format(Number(value));
}

export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function formatDate(value: Date | string, format = "MM/DD/YYYY") {
  const date = value instanceof Date ? value : new Date(value);
  const [year, month, day] = date.toISOString().slice(0, 10).split("-");
  if (format === "DD/MM/YYYY") return `${day}/${month}/${year}`;
  if (format === "YYYY-MM-DD") return `${year}-${month}-${day}`;
  return `${month}/${day}/${year}`;
}
