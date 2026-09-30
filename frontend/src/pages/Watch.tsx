import { Check, Share2, ThumbsDown, ThumbsUp } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { SubscribeButton } from "../components/SubscribeButton";
import { VideoListSkeleton, VideoRow } from "../components/VideoCard";
import { Alert, Avatar, Button, Spinner } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { formatCount, formatDate, formatViews, timeAgo } from "../lib/format";
import type { Comment, Video } from "../lib/types";
import { useAsync } from "../lib/useAsync";
import { commentService, userService, videoService } from "../services";

export function Watch() {
  const { videoId = "" } = useParams();
  const { data: video, loading, error } = useAsync(() => videoService.get(videoId), [videoId]);
  const related = useAsync(() => videoService.list({ limit: 12 }), []);

  useEffect(() => window.scrollTo(0, 0), [videoId]);

  return (
    <div className="mx-auto flex max-w-[1700px] flex-col gap-6 px-4 py-6 sm:px-6 xl:flex-row">
      <div className="min-w-0 flex-1">
        {error && <Alert>{error}</Alert>}
        {loading || !video ? !error && <Spinner className="aspect-video rounded-xl bg-surface" /> : <VideoDetails key={video._id} video={video} />}
      </div>

      <aside className="w-full shrink-0 xl:w-[400px]">
        <h2 className="mb-3 font-semibold xl:sr-only">Up next</h2>
        {related.loading ? (
          <VideoListSkeleton compact count={8} />
        ) : (
          <div className="space-y-3">
            {related.data?.docs
              .filter((v) => v._id !== videoId)
              .map((v) => (
                <VideoRow key={v._id} video={v} compact />
              ))}
          </div>
        )}
      </aside>
    </div>
  );
}

function VideoDetails({ video }: { video: Video & { isLiked?: boolean } }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(!!video.isLiked);
  const [likes, setLikes] = useState(video.likes);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const channel = useAsync(() => userService.getChannel(video.owner.username), [video.owner.username]);
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const isSubscribed = subscribed ?? channel.data?.isSubscribed ?? false;
  const subscribers = (channel.data?.subscriptionCount ?? 0) + (subscribed === null ? 0 : Number(subscribed) - Number(channel.data?.isSubscribed ?? false));

  async function toggleLike() {
    if (!user) return navigate("/login");
    const prev = liked;
    setLiked(!prev);
    setLikes((n) => n + (prev ? -1 : 1));
    try {
      await videoService.toggleLike(video._id);
    } catch {
      setLiked(prev);
      setLikes((n) => n + (prev ? 1 : -1));
    }
  }

  async function share() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl bg-black">
        <video src={video.videoFile} poster={video.thumbnail} controls autoPlay className="aspect-video w-full" />
      </div>

      <h1 className="mt-3 text-xl font-bold">{video.title}</h1>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to={`/c/${video.owner.username}`}>
            <Avatar src={video.owner.avatar} name={video.owner.fullname} size={40} />
          </Link>
          <div className="mr-3">
            <Link to={`/c/${video.owner.username}`} className="font-semibold capitalize">
              {video.owner.fullname}
            </Link>
            <p className="text-xs text-muted">{channel.data ? `${formatCount(subscribers)} subscribers` : " "}</p>
          </div>
          <SubscribeButton channelId={video.owner._id} subscribed={isSubscribed} onChange={setSubscribed} />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex h-9 items-center rounded-full bg-elevated">
            <button onClick={toggleLike} aria-pressed={liked} className="flex h-full cursor-pointer items-center gap-2 rounded-l-full pr-3 pl-4 text-sm font-medium hover:bg-hover">
              <ThumbsUp className={`size-5 ${liked ? "fill-fg" : ""}`} /> {formatCount(likes)}
            </button>
            <span className="h-6 w-px bg-line" />
            <button aria-label="Dislike" className="flex h-full cursor-pointer items-center rounded-r-full pr-4 pl-3 hover:bg-hover">
              <ThumbsDown className="size-5" />
            </button>
          </div>
          <Button onClick={share}>
            {copied ? <Check className="size-5" /> : <Share2 className="size-5" />} {copied ? "Copied" : "Share"}
          </Button>
        </div>
      </div>

      <div
        onClick={() => setExpanded(true)}
        className={`mt-4 rounded-xl bg-elevated p-3 text-sm ${expanded ? "" : "cursor-pointer hover:bg-hover"}`}
      >
        <p className="font-semibold">
          {expanded ? `${video.views.toLocaleString()} views • ${formatDate(video.createdAt)}` : `${formatViews(video.views)} • ${timeAgo(video.createdAt)}`}
        </p>
        <p className={`mt-1 whitespace-pre-line ${expanded ? "" : "line-clamp-2"}`}>{video.description}</p>
        {expanded ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(false);
            }}
            className="mt-3 cursor-pointer font-semibold"
          >
            Show less
          </button>
        ) : (
          <span className="font-semibold">...more</span>
        )}
      </div>

      <Comments videoId={video._id} />
    </>
  );
}

function Comments({ videoId }: { videoId: string }) {
  const { user } = useAuth();
  const { data, loading } = useAsync(() => commentService.list(videoId), [videoId]);
  const [added, setAdded] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const comments = [...added, ...(data ?? [])];

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user || !text.trim()) return;
    setBusy(true);
    try {
      const comment = await commentService.add(videoId, text.trim(), user);
      setAdded((c) => [comment, ...c]);
      setText("");
      setFocused(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6">
      <h2 className="mb-5 text-xl font-bold">{loading ? "Comments" : `${comments.length} Comments`}</h2>

      {user ? (
        <form onSubmit={submit} className="mb-8 flex gap-4">
          <Avatar src={user.avatar} name={user.fullname} size={40} />
          <div className="flex-1">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onFocus={() => setFocused(true)}
              placeholder="Add a comment..."
              className="w-full border-b border-line bg-transparent pb-1 text-sm outline-none focus:border-fg"
            />
            {focused && (
              <div className="mt-2 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => (setFocused(false), setText(""))}>
                  Cancel
                </Button>
                <Button type="submit" variant="brand" disabled={!text.trim()} loading={busy}>
                  Comment
                </Button>
              </div>
            )}
          </div>
        </form>
      ) : (
        <p className="mb-8 text-sm text-muted">
          <Link to="/login" className="text-blue-400 hover:underline">
            Sign in
          </Link>{" "}
          to join the conversation.
        </p>
      )}

      {loading ? (
        <Spinner />
      ) : (
        <ul className="space-y-6">
          {comments.map((c) => (
            <li key={c._id} className="flex gap-4">
              <Link to={`/c/${c.owner.username}`}>
                <Avatar src={c.owner.avatar} name={c.owner.fullname} size={40} />
              </Link>
              <div className="text-sm">
                <p>
                  <Link to={`/c/${c.owner.username}`} className="font-medium">
                    @{c.owner.username}
                  </Link>{" "}
                  <span className="text-xs text-muted">{timeAgo(c.createdAt)}</span>
                </p>
                <p className="mt-1">{c.content}</p>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                  <ThumbsUp className="size-4" /> {c.likes > 0 && formatCount(c.likes)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
