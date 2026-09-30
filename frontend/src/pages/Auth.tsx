import { Camera, ImagePlus } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Logo } from "../components/Layout";
import { Alert, Avatar, Button, Field } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { errorMessage } from "../lib/api";
import { usePreview } from "../lib/useAsync";

function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[radial-gradient(ellipse_at_top,rgba(255,45,85,0.12),transparent_60%)] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl sm:p-8">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <h1 className="text-center text-2xl font-bold">{title}</h1>
        <p className="mt-1 mb-6 text-center text-sm text-muted">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? "/";
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(identifier, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to continue to VideoTube">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Field label="Username or email" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" required />
        <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        <Button type="submit" variant="brand" loading={busy} className="h-10 w-full">
          Sign in
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        New to VideoTube?{" "}
        <Link to="/register" className="font-medium text-blue-400 hover:underline">
          Create an account
        </Link>
      </p>
    </AuthCard>
  );
}

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fields, setFields] = useState({ fullname: "", username: "", email: "", password: "" });
  const [avatar, setAvatar] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const avatarUrl = usePreview(avatar);
  const coverUrl = usePreview(cover);

  const set = (key: keyof typeof fields) => (e: React.ChangeEvent<HTMLInputElement>) => setFields((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    // The backend requires both images
    if (!avatar || !cover) return setError("Please add both a profile picture and a cover image.");
    setError(null);
    setBusy(true);
    const form = new FormData();
    Object.entries(fields).forEach(([k, v]) => form.append(k, v));
    form.append("avatar", avatar);
    form.append("coverImage", cover);
    try {
      await register(form);
      navigate("/", { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Create your channel" subtitle="Join VideoTube to upload, like and subscribe">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert>{error}</Alert>}

        {/* Cover + avatar picker, laid out like the channel header */}
        <div className="relative mb-10">
          <label className="group relative block aspect-[4/1] cursor-pointer overflow-hidden rounded-xl border border-dashed border-line bg-elevated">
            {coverUrl ? (
              <img src={coverUrl} alt="Cover preview" className="size-full object-cover" />
            ) : (
              <span className="flex size-full items-center justify-center gap-2 text-xs text-muted">
                <ImagePlus className="size-4" /> Add cover image
              </span>
            )}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => setCover(e.target.files?.[0] ?? null)} />
          </label>
          <label className="absolute -bottom-8 left-4 cursor-pointer rounded-full border-4 border-surface">
            <Avatar src={avatarUrl} name={fields.fullname || "?"} size={72} />
            <span className="absolute right-0 bottom-0 grid size-6 place-items-center rounded-full bg-fg text-canvas">
              <Camera className="size-3.5" />
            </span>
            <input type="file" accept="image/*" className="sr-only" aria-label="Profile picture" onChange={(e) => setAvatar(e.target.files?.[0] ?? null)} />
          </label>
        </div>

        <Field label="Full name" value={fields.fullname} onChange={set("fullname")} autoComplete="name" required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Username" value={fields.username} onChange={set("username")} autoComplete="username" pattern="[a-zA-Z0-9_.]+" title="Letters, numbers, dots and underscores" required />
          <Field label="Email" type="email" value={fields.email} onChange={set("email")} autoComplete="email" required />
        </div>
        <Field label="Password" type="password" value={fields.password} onChange={set("password")} autoComplete="new-password" minLength={6} required />
        <Button type="submit" variant="brand" loading={busy} className="h-10 w-full">
          Create account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-blue-400 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
