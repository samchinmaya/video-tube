import { LoaderCircle } from "lucide-react";
import { useId, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "brand";

const variants: Record<Variant, string> = {
  primary: "bg-fg text-canvas hover:bg-fg/85",
  secondary: "bg-elevated text-fg hover:bg-hover",
  ghost: "text-fg hover:bg-elevated",
  brand: "bg-brand text-white hover:bg-brand-hover",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

export function Button({ variant = "secondary", loading, className = "", disabled, children, ...rest }: ButtonProps) {
  return (
    <button
      className={`inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <LoaderCircle className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export function IconButton({ label, className = "", children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={`grid size-10 shrink-0 cursor-pointer place-items-center rounded-full transition-colors hover:bg-elevated ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

const inputClass =
  "w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none transition-colors placeholder:text-muted/70 focus:border-brand";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

export function Field({ label, hint, id, className = "", ...rest }: FieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium">
        {label}
      </label>
      <input id={inputId} className={`h-10 ${inputClass} ${className}`} {...rest} />
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function TextArea({ label, id, className = "", ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium">
        {label}
      </label>
      <textarea id={inputId} className={`min-h-28 resize-y py-2 ${inputClass} ${className}`} {...rest} />
    </div>
  );
}

export function Avatar({ src, name, size = 36, className = "" }: { src?: string; name: string; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size, fontSize: size * 0.42 };
  if (!src || failed) {
    return (
      <span style={style} className={`grid shrink-0 place-items-center rounded-full bg-brand/80 font-semibold text-white uppercase ${className}`}>
        {name.trim().charAt(0) || "?"}
      </span>
    );
  }
  return <img src={src} alt={name} style={style} onError={() => setFailed(true)} className={`shrink-0 rounded-full bg-elevated object-cover ${className}`} />;
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div className={`grid place-items-center py-16 ${className}`}>
      <LoaderCircle className="size-8 animate-spin text-muted" />
    </div>
  );
}

export function Alert({ children, tone = "error" }: { children: ReactNode; tone?: "error" | "success" }) {
  const styles = tone === "error" ? "border-brand/40 bg-brand/10 text-red-200" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
  return <div role={tone === "error" ? "alert" : "status"} className={`rounded-lg border px-3 py-2 text-sm ${styles}`}>{children}</div>;
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 py-20 text-center">
      <div className="grid size-16 place-items-center rounded-full bg-elevated text-muted [&>svg]:size-7">{icon}</div>
      <h2 className="text-lg font-semibold">{title}</h2>
      {children && <div className="text-sm text-muted">{children}</div>}
    </div>
  );
}

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold">{title}</h1>
      {children}
    </div>
  );
}
