import { SquarePlay, UserX } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { SubscribeButton } from "../components/SubscribeButton";
import { VideoGrid, VideoGridSkeleton } from "../components/VideoCard";
import { Avatar, EmptyState, Spinner } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { formatCount } from "../lib/format";
import type { Channel as ChannelData } from "../lib/types";
import { useAsync } from "../lib/useAsync";
import { userService, videoService } from "../services";

export function Channel() {
  const { username = "" } = useParams();
  const { data, loading, error } = useAsync(() => userService.getChannel(username), [username]);

  if (loading) return <Spinner />;
  if (error || !data) {
    return (
      <EmptyState icon={<UserX />} title="Channel not found">
        {error ?? "This channel doesn't exist."}
      </EmptyState>
    );
  }
  return <ChannelView key={data._id} channel={data} />;
}

function ChannelView({ channel: initial }: { channel: ChannelData }) {
  const { user } = useAuth();
  const [channel, setChannel] = useState(initial);
  const [tab, setTab] = useState<"videos" | "about">("videos");
  const videos = useAsync(() => videoService.byChannel(channel.username), [channel.username]);
  const isOwner = user?._id === channel._id;

  function onSubscribe(subscribed: boolean) {
    setChannel((c) => ({
      ...c,
      isSubscribed: subscribed,
      subscriptionCount: c.subscriptionCount + (subscribed === c.isSubscribed ? 0 : subscribed ? 1 : -1),
    }));
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="aspect-[6/1] min-h-24 overflow-hidden rounded-2xl bg-gradient-to-r from-brand/40 via-elevated to-surface">
        {channel.coverImage && <img src={channel.coverImage} alt="" className="size-full object-cover" />}
      </div>

      <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
        <Avatar src={channel.avatar} name={channel.fullname} size={128} className="max-sm:size-20!" />
        <div className="flex-1 space-y-2">
          <h1 className="text-3xl font-bold capitalize sm:text-4xl">{channel.fullname}</h1>
          <p className="text-sm text-muted">
            <span className="font-medium text-fg">@{channel.username}</span> • {formatCount(channel.subscriptionCount)} subscribers
            {videos.data && ` • ${videos.data.length} videos`}
          </p>
          {channel.description && <p className="line-clamp-1 text-sm text-muted">{channel.description}</p>}
          <div className="pt-1">
            {isOwner ? (
              <div className="flex gap-2">
                <Link to="/settings" className="inline-flex h-9 items-center rounded-full bg-elevated px-4 text-sm font-medium hover:bg-hover">
                  Customize channel
                </Link>
                <Link to="/upload" className="inline-flex h-9 items-center rounded-full bg-elevated px-4 text-sm font-medium hover:bg-hover">
                  Upload video
                </Link>
              </div>
            ) : (
              <SubscribeButton channelId={channel._id} subscribed={channel.isSubscribed} onChange={onSubscribe} />
            )}
          </div>
        </div>
      </div>

      <div role="tablist" className="mt-6 flex gap-6 border-b border-line">
        {(["videos", "about"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`-mb-px cursor-pointer border-b-2 pb-3 text-sm font-medium capitalize ${tab === t ? "border-fg" : "border-transparent text-muted hover:text-fg"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="py-6">
        {tab === "videos" ? (
          videos.loading ? (
            <VideoGridSkeleton count={4} />
          ) : videos.data?.length ? (
            <VideoGrid videos={videos.data} showOwner={false} />
          ) : (
            <EmptyState icon={<SquarePlay />} title={isOwner ? "Upload your first video" : "No videos yet"}>
              {isOwner ? (
                <Link to="/upload" className="text-blue-400 hover:underline">
                  Upload a video
                </Link>
              ) : (
                "This channel hasn't posted anything."
              )}
            </EmptyState>
          )
        ) : (
          <dl className="max-w-xl space-y-4 text-sm">
            {channel.description && <p className="whitespace-pre-line">{channel.description}</p>}
            <div className="flex gap-4">
              <dt className="w-32 text-muted">Subscribers</dt>
              <dd>{channel.subscriptionCount.toLocaleString()}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-32 text-muted">Subscribed to</dt>
              <dd>{channel.subscribedToCount.toLocaleString()} channels</dd>
            </div>
            {channel.email && (
              <div className="flex gap-4">
                <dt className="w-32 text-muted">Email</dt>
                <dd>{channel.email}</dd>
              </div>
            )}
          </dl>
        )}
      </div>
    </div>
  );
}
