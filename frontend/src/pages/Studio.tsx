import { CloudUpload, ImagePlus, KeyRound, Palette, UserRound } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { Alert, Avatar, Button, Field, PageHeader, TextArea } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { errorMessage } from "../lib/api";
import { formatDuration } from "../lib/format";
import { usePreview } from "../lib/useAsync";
import { userService, videoService } from "../services";

export function Upload() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [thumb, setThumb] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const videoUrl = usePreview(file);
  const thumbUrl = usePreview(thumb);

  function pickVideo(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith("video/")) return setError("That file isn't a video.");
    setError(null);
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user || !file) return;
    if (!thumb) return setError("Add a thumbnail so people know what your video is about.");
    setError(null);
    setBusy(true);
    const form = new FormData();
    form.append("videoFile", file);
    form.append("thumbnail", thumb);
    form.append("title", title.trim());
    form.append("description", description.trim());
    form.append("duration", String(Math.round(duration)));
    form.append("isPublished", String(isPublished));
    try {
      const video = await videoService.upload(form, user);
      navigate(`/watch/${video._id}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  if (!file) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Upload video" />
        {error && <Alert>{error}</Alert>}
        <label
          onDragOver={(e) => (e.preventDefault(), setDragging(true))}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pickVideo(e.dataTransfer.files[0]);
          }}
          className={`mt-4 flex cursor-pointer flex-col items-center gap-4 rounded-2xl border-2 border-dashed px-6 py-20 text-center transition-colors ${dragging ? "border-brand bg-brand/5" : "border-line hover:border-muted"}`}
        >
          <span className="grid size-28 place-items-center rounded-full bg-elevated">
            <CloudUpload className="size-12 text-muted" />
          </span>
          <span className="text-lg font-medium">Drag and drop a video file to upload</span>
          <span className="text-sm text-muted">Your video will stay private until you publish it.</span>
          <span className="mt-2 inline-flex h-9 items-center rounded-full bg-fg px-4 text-sm font-medium text-canvas">Select file</span>
          <input type="file" accept="video/*" className="sr-only" onChange={(e) => pickVideo(e.target.files?.[0])} />
        </label>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-5xl">
      <PageHeader title="Video details">
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={() => setFile(null)} disabled={busy}>
            Discard
          </Button>
          <Button type="submit" variant="brand" loading={busy}>
            {busy ? "Uploading…" : isPublished ? "Publish" : "Save as private"}
          </Button>
        </div>
      </PageHeader>
      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <Field label="Title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} required hint={`${title.length}/100`} />
          <TextArea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={6} placeholder="Tell viewers about your video" required />

          <div className="space-y-1.5">
            <p className="text-sm font-medium">Thumbnail</p>
            <label className="group relative flex aspect-video w-56 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-line bg-surface text-xs text-muted hover:border-muted">
              {thumbUrl ? <img src={thumbUrl} alt="Thumbnail preview" className="size-full object-cover" /> : <span className="flex flex-col items-center gap-1"><ImagePlus className="size-5" /> Upload thumbnail</span>}
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => setThumb(e.target.files?.[0] ?? null)} />
            </label>
          </div>

          <fieldset className="space-y-2">
            <legend className="mb-1.5 text-sm font-medium">Visibility</legend>
            {[
              { value: true, label: "Public", text: "Everyone can watch your video" },
              { value: false, label: "Private", text: "Only you can watch your video" },
            ].map((o) => (
              <label key={o.label} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${isPublished === o.value ? "border-brand bg-brand/5" : "border-line"}`}>
                <input type="radio" name="visibility" checked={isPublished === o.value} onChange={() => setIsPublished(o.value)} className="mt-1 accent-brand" />
                <span>
                  <span className="block text-sm font-medium">{o.label}</span>
                  <span className="text-xs text-muted">{o.text}</span>
                </span>
              </label>
            ))}
          </fieldset>
        </div>

        <aside className="h-fit overflow-hidden rounded-xl bg-surface">
          <video src={videoUrl} controls onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)} className="aspect-video w-full bg-black" />
          <dl className="space-y-3 p-4 text-sm">
            <div>
              <dt className="text-xs text-muted">Filename</dt>
              <dd className="truncate">{file.name}</dd>
            </div>
            <div className="flex gap-8">
              <div>
                <dt className="text-xs text-muted">Duration</dt>
                <dd>{duration ? formatDuration(duration) : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Size</dt>
                <dd>{(file.size / 1024 / 1024).toFixed(1)} MB</dd>
              </div>
            </div>
          </dl>
        </aside>
      </div>
    </form>
  );
}

type Tab = "profile" | "branding" | "password";

export function Settings() {
  const [tab, setTab] = useState<Tab>("profile");
  const tabs: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: "profile", label: "Profile", icon: <UserRound className="size-4" /> },
    { id: "branding", label: "Branding", icon: <Palette className="size-4" /> },
    { id: "password", label: "Password", icon: <KeyRound className="size-4" /> },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" />
      <div role="tablist" className="mb-6 flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`flex h-8 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors ${tab === t.id ? "bg-fg text-canvas" : "bg-elevated hover:bg-hover"}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      <div className="rounded-2xl border border-line bg-surface p-6">
        {tab === "profile" && <ProfileForm />}
        {tab === "branding" && <BrandingForm />}
        {tab === "password" && <PasswordForm />}
      </div>
    </div>
  );
}

// Small helper so each settings form shares the same submit/feedback handling
function useSubmit() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  async function run(action: () => Promise<string>) {
    setBusy(true);
    setMessage(null);
    try {
      setMessage({ tone: "success", text: await action() });
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }
  const feedback = message && <Alert tone={message.tone}>{message.text}</Alert>;
  return { busy, run, feedback };
}

function ProfileForm() {
  const { user, updateUser } = useAuth();
  const [fullname, setFullname] = useState(user?.fullname ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const { busy, run, feedback } = useSubmit();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(async () => {
          const { user } = await userService.updateAccount({ fullname, email });
          updateUser(user);
          return "Profile updated.";
        });
      }}
    >
      {feedback}
      <Field label="Full name" value={fullname} onChange={(e) => setFullname(e.target.value)} required />
      <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Field label="Username" value={user?.username ?? ""} disabled hint="Usernames can't be changed." />
      <Button type="submit" variant="brand" loading={busy}>
        Save changes
      </Button>
    </form>
  );
}

function ImagePicker({ label, preview, onPick, children }: { label: string; preview?: string; onPick: (f: File) => void; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex flex-wrap items-center gap-4">
        {children}
        <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full bg-elevated px-4 text-sm font-medium hover:bg-hover">
          <ImagePlus className="size-4" /> {preview ? "Choose another" : "Change"}
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])} />
        </label>
      </div>
    </div>
  );
}

function BrandingForm() {
  const { user, updateUser } = useAuth();
  const [avatar, setAvatar] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const avatarUrl = usePreview(avatar);
  const coverUrl = usePreview(cover);
  const { busy, run, feedback } = useSubmit();
  if (!user) return null;

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        run(async () => {
          if (avatar) updateUser(await userService.updateAvatar(avatar));
          if (cover) updateUser(await userService.updateCoverImage(cover));
          setAvatar(null);
          setCover(null);
          return "Branding updated.";
        });
      }}
    >
      {feedback}
      <ImagePicker label="Profile picture" preview={avatarUrl} onPick={setAvatar}>
        <Avatar src={avatarUrl ?? user.avatar} name={user.fullname} size={96} />
      </ImagePicker>
      <ImagePicker label="Banner image" preview={coverUrl} onPick={setCover}>
        <div className="aspect-[4/1] w-full max-w-md overflow-hidden rounded-lg bg-elevated">
          {(coverUrl ?? user.coverImage) && <img src={coverUrl ?? user.coverImage} alt="Banner" className="size-full object-cover" />}
        </div>
      </ImagePicker>
      <Button type="submit" variant="brand" loading={busy} disabled={!avatar && !cover}>
        Save
      </Button>
    </form>
  );
}

function PasswordForm() {
  const [values, setValues] = useState({ oldPassword: "", newPassword: "", confPassword: "" });
  const { busy, run, feedback } = useSubmit();
  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [k]: e.target.value }));
  const mismatch = values.confPassword.length > 0 && values.newPassword !== values.confPassword;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (mismatch) return;
        run(async () => {
          await userService.changePassword(values);
          setValues({ oldPassword: "", newPassword: "", confPassword: "" });
          return "Password changed.";
        });
      }}
    >
      {feedback}
      <Field label="Current password" type="password" value={values.oldPassword} onChange={set("oldPassword")} autoComplete="current-password" required />
      <Field label="New password" type="password" value={values.newPassword} onChange={set("newPassword")} autoComplete="new-password" minLength={6} required />
      <Field
        label="Confirm new password"
        type="password"
        value={values.confPassword}
        onChange={set("confPassword")}
        autoComplete="new-password"
        required
        hint={mismatch ? "Passwords don't match." : undefined}
        className={mismatch ? "border-brand" : ""}
      />
      <Button type="submit" variant="brand" loading={busy} disabled={mismatch}>
        Update password
      </Button>
    </form>
  );
}
