const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

export function formatCount(n: number): string {
  return compact.format(n);
}

export function formatViews(n: number): string {
  return `${formatCount(n)} ${n === 1 ? "view" : "views"}`;
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

const units: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31536000],
  ["month", 2592000],
  ["week", 604800],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];
const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function timeAgo(date: string): string {
  const seconds = (Date.now() - new Date(date).getTime()) / 1000;
  for (const [unit, size] of units) {
    if (seconds >= size) return relative.format(-Math.floor(seconds / size), unit);
  }
  return "just now";
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" });
}
