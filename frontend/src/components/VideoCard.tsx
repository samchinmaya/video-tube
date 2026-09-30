import { Link } from "react-router";
import { formatDuration, formatViews, timeAgo } from "../lib/format";
import type { Video } from "../lib/types";
import { Avatar } from "./ui";

function Thumbnail({ video, className = "" }: { video: Video; className?: string }) {
  return (
    <Link to={`/watch/${video._id}`} className={`relative block aspect-video shrink-0 overflow-hidden rounded-xl bg-elevated ${className}`}>
      <img src={video.thumbnail} alt="" loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
      <span className="absolute right-1.5 bottom-1.5 rounded bg-black/80 px-1 py-0.5 text-xs font-medium">{formatDuration(video.duration)}</span>
    </Link>
  );
}

// Grid card used on home, channel and subscription feeds
export function VideoCard({ video, showOwner = true }: { video: Video; showOwner?: boolean }) {
  return (
    <article className="group">
      <Thumbnail video={video} />
      <div className="mt-3 flex gap-3">
        {showOwner && (
          <Link to={`/c/${video.owner.username}`} className="shrink-0">
            <Avatar src={video.owner.avatar} name={video.owner.fullname} />
          </Link>
        )}
        <div className="min-w-0">
          <Link to={`/watch/${video._id}`}>
            <h3 className="line-clamp-2 leading-snug font-medium">{video.title}</h3>
          </Link>
          {showOwner && (
            <Link to={`/c/${video.owner.username}`} className="mt-1 block text-sm text-muted hover:text-fg">
              {video.owner.fullname}
            </Link>
          )}
          <p className="text-sm text-muted">
            {formatViews(video.views)} • {timeAgo(video.createdAt)}
          </p>
        </div>
      </div>
    </article>
  );
}

// Horizontal row used for search results, history and "Up next"
export function VideoRow({ video, compact = false }: { video: Video; compact?: boolean }) {
  return (
    <article className="group flex gap-3">
      <Thumbnail video={video} className={compact ? "w-40" : "w-44 sm:w-64 md:w-80"} />
      <div className="min-w-0 py-0.5">
        <Link to={`/watch/${video._id}`}>
          <h3 className={`line-clamp-2 leading-snug font-medium ${compact ? "text-sm" : "sm:text-lg"}`}>{video.title}</h3>
        </Link>
        <p className="mt-1 text-xs text-muted">
          {formatViews(video.views)} • {timeAgo(video.createdAt)}
        </p>
        <Link to={`/c/${video.owner.username}`} className={`flex items-center gap-2 text-xs text-muted hover:text-fg ${compact ? "mt-1" : "my-2"}`}>
          {!compact && <Avatar src={video.owner.avatar} name={video.owner.fullname} size={24} />}
          {video.owner.fullname}
        </Link>
        {!compact && <p className="line-clamp-2 hidden text-xs text-muted sm:block">{video.description}</p>}
      </div>
    </article>
  );
}

export function VideoGrid({ videos, showOwner }: { videos: Video[]; showOwner?: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {videos.map((v) => (
        <VideoCard key={v._id} video={v} showOwner={showOwner} />
      ))}
    </div>
  );
}

export function VideoGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-video rounded-xl bg-elevated" />
          <div className="mt-3 flex gap-3">
            <div className="size-9 shrink-0 rounded-full bg-elevated" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-11/12 rounded bg-elevated" />
              <div className="h-3 w-1/2 rounded bg-elevated" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function VideoListSkeleton({ count = 5, compact = false }: { count?: number; compact?: boolean }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex animate-pulse gap-3">
          <div className={`aspect-video shrink-0 rounded-xl bg-elevated ${compact ? "w-40" : "w-44 sm:w-64 md:w-80"}`} />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 w-11/12 rounded bg-elevated" />
            <div className="h-3 w-1/2 rounded bg-elevated" />
          </div>
        </div>
      ))}
    </div>
  );
}
