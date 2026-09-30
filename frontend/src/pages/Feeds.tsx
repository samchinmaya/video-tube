import { History as HistoryIcon, SearchX, SquarePlay, ThumbsUp } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { VideoGrid, VideoGridSkeleton, VideoListSkeleton, VideoRow } from "../components/VideoCard";
import { Alert, Button, EmptyState, PageHeader } from "../components/ui";
import { errorMessage } from "../lib/api";
import type { Video } from "../lib/types";
import { useAsync } from "../lib/useAsync";
import { videoService } from "../services";

export function Home() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    videoService
      .list({ page })
      .then((res) => {
        if (!active) return;
        setVideos((prev) => (page === 1 ? res.docs : [...prev, ...res.docs]));
        setHasMore(res.hasNextPage);
      })
      .catch((err) => active && setError(errorMessage(err)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [page]);

  if (error) return <Alert>{error}</Alert>;
  if (loading && page === 1) return <VideoGridSkeleton />;
  if (!videos.length) return <EmptyState icon={<SquarePlay />} title="No videos yet">Be the first to upload something.</EmptyState>;

  return (
    <>
      <VideoGrid videos={videos} />
      {hasMore && (
        <div className="mt-10 flex justify-center">
          <Button loading={loading} onClick={() => setPage((p) => p + 1)}>
            Load more
          </Button>
        </div>
      )}
    </>
  );
}

export function Results() {
  const [params] = useSearchParams();
  const q = params.get("q") ?? "";
  const { data, loading, error } = useAsync(() => videoService.list({ query: q, limit: 30 }), [q]);

  return (
    <div className="mx-auto max-w-5xl">
      <p className="mb-4 text-sm text-muted">
        Results for <span className="font-medium text-fg">“{q}”</span>
      </p>
      {error && <Alert>{error}</Alert>}
      {loading ? (
        <VideoListSkeleton />
      ) : data?.docs.length ? (
        <div className="space-y-4">
          {data.docs.map((v) => (
            <VideoRow key={v._id} video={v} />
          ))}
        </div>
      ) : (
        <EmptyState icon={<SearchX />} title="No results found">Try different keywords or remove filters.</EmptyState>
      )}
    </div>
  );
}

function VideoListPage({ title, load, empty }: { title: string; load: () => Promise<Video[]>; empty: { icon: React.ReactNode; title: string; text: string } }) {
  const { data, loading, error } = useAsync(load, []);
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={title} />
      {error && <Alert>{error}</Alert>}
      {loading ? (
        <VideoListSkeleton />
      ) : data?.length ? (
        <div className="space-y-4">
          {data.map((v) => (
            <VideoRow key={v._id} video={v} />
          ))}
        </div>
      ) : (
        <EmptyState icon={empty.icon} title={empty.title}>
          {empty.text}{" "}
          <Link to="/" className="text-blue-400 hover:underline">
            Browse videos
          </Link>
        </EmptyState>
      )}
    </div>
  );
}

export function WatchHistory() {
  return <VideoListPage title="Watch history" load={videoService.history} empty={{ icon: <HistoryIcon />, title: "No watch history", text: "Videos you watch will show up here." }} />;
}

export function Liked() {
  return <VideoListPage title="Liked videos" load={videoService.liked} empty={{ icon: <ThumbsUp />, title: "No liked videos", text: "Tap 👍 on a video to save it here." }} />;
}

export function Subscriptions() {
  const { data, loading, error } = useAsync(videoService.subscriptionFeed, []);
  return (
    <>
      <PageHeader title="Latest from your subscriptions" />
      {error && <Alert>{error}</Alert>}
      {loading ? (
        <VideoGridSkeleton />
      ) : data?.length ? (
        <VideoGrid videos={data} />
      ) : (
        <EmptyState icon={<SquarePlay />} title="Nothing here yet">Subscribe to channels to see their latest videos.</EmptyState>
      )}
    </>
  );
}
