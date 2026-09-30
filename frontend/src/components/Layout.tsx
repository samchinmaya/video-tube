import { ArrowLeft, CircleUser, History, House, LogOut, Menu, Plus, Search, Settings, SquarePlay, ThumbsUp, Upload, Users, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useMediaQuery } from "../lib/useAsync";
import { subscriptionService } from "../services";
import { Avatar, IconButton, Spinner } from "./ui";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-1.5 px-2" aria-label="VideoTube home">
      <span className="grid h-6 w-8 place-items-center rounded-md bg-brand">
        <svg viewBox="0 0 24 24" className="size-3.5 fill-white">
          <path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l10.8-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14Z" />
        </svg>
      </span>
      <span className="text-lg font-bold tracking-tight">
        Video<span className="text-brand">Tube</span>
      </span>
    </Link>
  );
}

function SearchBar({ onClose }: { onClose?: () => void }) {
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const navigate = useNavigate();

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    navigate(`/results?q=${encodeURIComponent(q.trim())}`);
    onClose?.();
  }

  return (
    <form onSubmit={submit} role="search" className="flex w-full max-w-xl items-center">
      {onClose && (
        <IconButton label="Close search" type="button" onClick={onClose} className="mr-2">
          <ArrowLeft className="size-5" />
        </IconButton>
      )}
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search"
        aria-label="Search videos"
        autoFocus={!!onClose}
        className="h-10 min-w-0 flex-1 rounded-l-full border border-line bg-canvas px-4 outline-none placeholder:text-muted focus:border-blue-500"
      />
      <button type="submit" aria-label="Search" className="grid h-10 w-16 cursor-pointer place-items-center rounded-r-full border border-l-0 border-line bg-elevated hover:bg-hover">
        <Search className="size-5" />
      </button>
    </form>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;
  const item = "flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-sm hover:bg-hover";

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-label="Account menu" aria-expanded={open} className="cursor-pointer rounded-full">
        <Avatar src={user.avatar} name={user.fullname} size={32} />
      </button>
      {open && (
        <div className="absolute top-11 right-0 z-50 w-64 overflow-hidden rounded-xl border border-line bg-elevated py-2 shadow-2xl">
          <div className="flex gap-3 border-b border-line px-4 pt-2 pb-3">
            <Avatar src={user.avatar} name={user.fullname} size={40} />
            <div className="min-w-0">
              <p className="truncate font-medium capitalize">{user.fullname}</p>
              <p className="truncate text-sm text-muted">@{user.username}</p>
              <Link to={`/c/${user.username}`} onClick={() => setOpen(false)} className="mt-1 inline-block text-sm text-blue-400 hover:underline">
                View your channel
              </Link>
            </div>
          </div>
          <div className="pt-2">
            <Link to="/upload" onClick={() => setOpen(false)} className={item}>
              <Upload className="size-5" /> Upload video
            </Link>
            <Link to="/settings" onClick={() => setOpen(false)} className={item}>
              <Settings className="size-5" /> Settings
            </Link>
            <button
              className={item}
              onClick={async () => {
                setOpen(false);
                await logout();
                navigate("/");
              }}
            >
              <LogOut className="size-5" /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Navbar({ onMenu }: { onMenu: () => void }) {
  const { user, loading } = useAuth();
  const [searching, setSearching] = useState(false);

  if (searching) {
    return (
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center bg-canvas px-2 sm:hidden">
        <SearchBar onClose={() => setSearching(false)} />
      </header>
    );
  }

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between gap-4 bg-canvas px-2 sm:px-4">
      <div className="flex shrink-0 items-center gap-2">
        <IconButton label="Menu" onClick={onMenu}>
          <Menu className="size-5" />
        </IconButton>
        <Logo />
      </div>
      <div className="hidden flex-1 justify-center sm:flex">
        <SearchBar />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <IconButton label="Search" className="sm:hidden" onClick={() => setSearching(true)}>
          <Search className="size-5" />
        </IconButton>
        {loading ? (
          <div className="size-8 animate-pulse rounded-full bg-elevated" />
        ) : user ? (
          <>
            <Link to="/upload" className="hidden h-9 items-center gap-1.5 rounded-full bg-elevated px-3 text-sm font-medium hover:bg-hover md:flex">
              <Plus className="size-5" /> Create
            </Link>
            <UserMenu />
          </>
        ) : (
          <Link to="/login" className="flex h-9 items-center gap-2 rounded-full border border-line px-3 text-sm font-medium text-blue-400 hover:bg-blue-500/10">
            <CircleUser className="size-5" /> Sign in
          </Link>
        )}
      </div>
    </header>
  );
}

function SideLink({ to, icon, label, mini, end }: { to: string; icon: ReactNode; label: string; mini?: boolean; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        mini
          ? `flex flex-col items-center gap-1.5 rounded-lg py-4 text-[10px] hover:bg-elevated ${isActive ? "font-medium" : ""}`
          : `flex h-10 items-center gap-5 rounded-lg px-3 text-sm hover:bg-elevated ${isActive ? "bg-elevated font-medium" : ""}`
      }
    >
      <span className="[&>svg]:size-5">{icon}</span>
      {label}
    </NavLink>
  );
}

function Sidebar({ mini, onNavigate }: { mini?: boolean; onNavigate?: () => void }) {
  const { user } = useAuth();

  if (mini) {
    return (
      <nav className="w-[72px] space-y-1 px-1 pt-1">
        <SideLink mini to="/" end icon={<House />} label="Home" />
        <SideLink mini to="/subscriptions" icon={<SquarePlay />} label="Subscriptions" />
        <SideLink mini to={user ? `/c/${user.username}` : "/login"} icon={<CircleUser />} label="You" />
        <SideLink mini to="/history" icon={<History />} label="History" />
      </nav>
    );
  }

  const channels = subscriptionService.subscribedChannels();
  return (
    <nav onClick={(e) => (e.target as HTMLElement).closest("a") && onNavigate?.()} className="w-60 space-y-3 px-3 pb-6">
      <div className="space-y-0.5 border-b border-line pb-3">
        <SideLink to="/" end icon={<House />} label="Home" />
        <SideLink to="/subscriptions" icon={<SquarePlay />} label="Subscriptions" />
      </div>

      <div className="space-y-0.5 border-b border-line pb-3">
        <h3 className="px-3 py-1.5 font-semibold">You</h3>
        {user && <SideLink to={`/c/${user.username}`} icon={<CircleUser />} label="Your channel" />}
        <SideLink to="/history" icon={<History />} label="History" />
        <SideLink to="/liked" icon={<ThumbsUp />} label="Liked videos" />
        <SideLink to="/upload" icon={<Upload />} label="Upload" />
      </div>

      {user ? (
        <div className="space-y-0.5 border-b border-line pb-3">
          <h3 className="px-3 py-1.5 font-semibold">Subscriptions</h3>
          {channels.map((c) => (
            <NavLink key={c._id} to={`/c/${c.username}`} className="flex h-10 items-center gap-4 rounded-lg px-3 text-sm hover:bg-elevated">
              <Avatar src={c.avatar} name={c.fullname} size={24} />
              <span className="truncate">{c.fullname}</span>
            </NavLink>
          ))}
          <SideLink to="/subscriptions" icon={<Users />} label="All subscriptions" />
        </div>
      ) : (
        <div className="space-y-3 border-b border-line px-3 pb-4 text-sm">
          <p>Sign in to like videos, comment, and subscribe.</p>
          <Link to="/login" className="inline-flex h-9 items-center gap-2 rounded-full border border-line px-3 font-medium text-blue-400 hover:bg-blue-500/10">
            <CircleUser className="size-5" /> Sign in
          </Link>
        </div>
      )}

      <p className="px-3 text-xs text-muted">
        © {new Date().getFullYear()} VideoTube
      </p>
    </nav>
  );
}

export function Layout() {
  const location = useLocation();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isWatch = location.pathname.startsWith("/watch");
  // Desktop: full sidebar that collapses to a mini rail. Mobile and the watch page: slide-over drawer.
  const docked = isDesktop && !isWatch;
  const [expanded, setExpanded] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen">
      <Navbar onMenu={() => (docked ? setExpanded((e) => !e) : setDrawerOpen((o) => !o))} />

      {docked && (
        <aside className="fixed top-14 bottom-0 left-0 z-30 overflow-y-auto">
          <Sidebar mini={!expanded} />
        </aside>
      )}

      {!docked && drawerOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute inset-y-0 left-0 overflow-y-auto bg-canvas">
            <div className="flex h-14 items-center gap-2 px-2 sm:px-4">
              <IconButton label="Close menu" onClick={() => setDrawerOpen(false)}>
                <X className="size-5" />
              </IconButton>
              <Logo />
            </div>
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <main className={`pt-14 ${docked ? (expanded ? "pl-60" : "pl-[72px]") : ""}`}>
        <div className={isWatch ? "" : "px-4 py-6 sm:px-6"}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

// Wraps routes that need a signed-in user
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}
