import i18n from "@/shared/config/i18n";

function getLocale(): string {
  return i18n.language || "en";
}

function formatNumber(value: number, fractionDigits: number): string {
  return new Intl.NumberFormat(getLocale(), {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${formatNumber(bytes / (1024 * 1024 * 1024), 2)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${formatNumber(bytes / (1024 * 1024), 2)} MB`;
  }
  if (bytes >= 1024) {
    return `${formatNumber(bytes / 1024, 2)} KB`;
  }
  return `${bytes} B`;
}

export function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  const rtf = new Intl.RelativeTimeFormat(getLocale(), { numeric: "auto" });

  if (diffDay > 0) return rtf.format(-diffDay, "day");
  if (diffHour > 0) return rtf.format(-diffHour, "hour");
  if (diffMin > 0) return rtf.format(-diffMin, "minute");
  return rtf.format(0, "second");
}
