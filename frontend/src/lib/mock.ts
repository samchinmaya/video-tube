// Stand-in data for features the backend doesn't expose yet (videos, comments,
// likes, history). Everything here is in-memory and resets on reload.
import type { Channel, Comment, Owner, Paginated, Video } from "./types";

const SAMPLE_VIDEO = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
const HOUR = 3600 * 1000;

const channelSeeds = [
  ["codewithara", "Code with Ara", "Backend, databases and everything in between. New tutorials every week."],
  ["lofibeatslab", "Lofi Beats Lab", "Long mixes to study, code and relax to."],
  ["trailtales", "Trail Tales", "Treks, trails and budget travel across Asia."],
  ["pixelforge", "Pixel Forge", "Building worlds and breaking games."],
  ["kitchenwithkiran", "Kitchen with Kiran", "Home cooking that actually works on a weeknight."],
  ["orbitscience", "Orbit Science", "Big ideas in physics and space, explained simply."],
  ["fitwithmeera", "Fit with Meera", "No-equipment workouts and honest nutrition."],
  ["frameandfilm", "Frame & Film", "Filmmaking on a budget: shooting, editing, color."],
] as const;

const titles = [
  ["Build a REST API with Express 5 in 30 minutes", "JWT auth explained: access vs refresh tokens", "MongoDB aggregation pipelines, visually explained"],
  ["Rainy night lofi — 2 hours to study and relax", "Chill beats for late-night coding", "Morning coffee jazz mix"],
  ["Solo trek to Hampta Pass — 5 days in the Himalayas", "48 hours in Kyoto on a budget", "Hidden beaches of Gokarna"],
  ["I built a whole city in 100 days", "Speedrunning the hardest level ever made", "10 indie games you missed this year"],
  ["Perfect butter chicken at home", "15-minute weeknight biryani", "Street-style pani puri from scratch"],
  ["What actually happens inside a black hole?", "How GPS knows exactly where you are", "The James Webb telescope's strangest discoveries"],
  ["20-minute full-body workout, no equipment", "Beginner yoga for back pain", "What I eat in a day to build muscle"],
  ["Cinematic shots with just a phone", "Color grading basics in 10 minutes", "How I shot a short film for $0"],
];

// Small deterministic PRNG so numbers don't change between reloads
function seeded(n: number) {
  const x = Math.sin(n * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

export const mockChannels: Channel[] = channelSeeds.map(([username, fullname, description], i) => ({
  _id: `mock-ch-${i + 1}`,
  username,
  fullname,
  description,
  avatar: `https://picsum.photos/seed/vt-avatar-${i}/96/96`,
  coverImage: `https://picsum.photos/seed/vt-cover-${i}/1600/400`,
  subscriptionCount: Math.round(seeded(i) * 2_400_000) + 1200,
  subscribedToCount: Math.round(seeded(i + 50) * 80),
  isSubscribed: i < 4,
}));

const toOwner = ({ _id, username, fullname, avatar }: Channel): Owner => ({ _id, username, fullname, avatar });

const videos: Video[] = titles.flatMap((list, c) =>
  list.map((title, j) => {
    const i = c * 3 + j;
    return {
      _id: `mock-v-${i + 1}`,
      videoFile: SAMPLE_VIDEO,
      thumbnail: `https://picsum.photos/seed/vt-thumb-${i}/640/360`,
      title,
      description: `${title}.\n\n${channelSeeds[c][2]}\n\nThis is placeholder content — real videos will appear here once the /videos API is built.`,
      duration: c === 1 ? 3600 + Math.round(seeded(i) * 3600) : 120 + Math.round(seeded(i) * 1800),
      views: Math.round(seeded(i + 100) ** 2 * 3_000_000) + 300,
      likes: Math.round(seeded(i + 200) * 90_000),
      dislikes: Math.round(seeded(i + 300) * 900),
      isPublished: true,
      owner: toOwner(mockChannels[c]),
      createdAt: new Date(Date.now() - Math.round(seeded(i + 400) * 24 * 120) * HOUR).toISOString(),
    };
  }),
);
// Interleave channels in the home feed instead of grouping them
videos.sort((a, b) => seeded(Number(a._id.slice(7))) - seeded(Number(b._id.slice(7))));

const commentTexts = [
  "This is exactly what I was looking for, thank you!",
  "The editing on this keeps getting better 🔥",
  "Watched this twice. The explanation at the halfway mark finally made it click.",
  "Can you make a follow-up on this?",
  "Underrated channel. Glad the algorithm brought me here.",
];

const history: string[] = [videos[2]._id, videos[7]._id, videos[11]._id];
const liked = new Set<string>([videos[0]._id, videos[5]._id]);
const comments = new Map<string, Comment[]>();

const wait = <T>(value: T, ms = 350) => new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

function paginate<T>(items: T[], page: number, limit: number): Paginated<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / limit));
  return {
    docs: items.slice((page - 1) * limit, page * limit),
    totalDocs: items.length,
    page,
    totalPages,
    hasNextPage: page < totalPages,
  };
}

export const mock = {
  listVideos(page: number, limit: number, query: string) {
    const q = query.trim().toLowerCase();
    const matches = q
      ? videos.filter((v) => `${v.title} ${v.owner.fullname}`.toLowerCase().includes(q))
      : videos;
    return wait(paginate(matches, page, limit));
  },

  getVideo(id: string) {
    const video = videos.find((v) => v._id === id);
    if (!video) return Promise.reject(new Error("Video not found"));
    video.views += 1;
    const seen = history.indexOf(id);
    if (seen !== -1) history.splice(seen, 1);
    history.unshift(id);
    return wait({ ...video, isLiked: liked.has(id) });
  },

  channelVideos(username: string) {
    return wait(videos.filter((v) => v.owner.username === username));
  },

  getChannel(username: string) {
    return mockChannels.find((c) => c.username === username);
  },

  history() {
    return wait(history.map((id) => videos.find((v) => v._id === id)!).filter(Boolean));
  },

  likedVideos() {
    return wait(videos.filter((v) => liked.has(v._id)));
  },

  toggleLike(id: string) {
    const video = videos.find((v) => v._id === id);
    const isLiked = !liked.has(id);
    if (isLiked) liked.add(id);
    else liked.delete(id);
    if (video) video.likes += isLiked ? 1 : -1;
    return wait({ isLiked }, 100);
  },

  subscribedChannels() {
    return mockChannels.filter((c) => c.isSubscribed);
  },

  subscriptionFeed() {
    const ids = new Set(mockChannels.filter((c) => c.isSubscribed).map((c) => c._id));
    return wait(
      videos
        .filter((v) => ids.has(v.owner._id))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  },

  toggleSubscription(channelId: string) {
    const channel = mockChannels.find((c) => c._id === channelId);
    if (channel) {
      channel.isSubscribed = !channel.isSubscribed;
      channel.subscriptionCount += channel.isSubscribed ? 1 : -1;
    }
    return wait({ subscribed: channel?.isSubscribed ?? false }, 100);
  },

  comments(videoId: string) {
    if (!comments.has(videoId)) {
      const n = Number(videoId.replace(/\D/g, "")) || 0;
      comments.set(
        videoId,
        commentTexts.map((content, k) => ({
          _id: `${videoId}-c${k}`,
          content,
          owner: toOwner(mockChannels[(n + k) % mockChannels.length]),
          likes: Math.round(seeded(n * 10 + k) * 400),
          createdAt: new Date(Date.now() - (k + 1) * 7 * HOUR).toISOString(),
        })),
      );
    }
    return wait([...comments.get(videoId)!]);
  },

  addComment(videoId: string, content: string, owner: Owner) {
    const comment: Comment = { _id: crypto.randomUUID(), content, owner, likes: 0, createdAt: new Date().toISOString() };
    comments.get(videoId)?.unshift(comment);
    return wait(comment, 150);
  },

  upload(form: FormData, owner: Owner) {
    const file = form.get("videoFile") as File;
    const thumb = form.get("thumbnail") as File;
    const video: Video = {
      _id: `mock-v-${Date.now()}`,
      videoFile: URL.createObjectURL(file),
      thumbnail: URL.createObjectURL(thumb),
      title: String(form.get("title")),
      description: String(form.get("description")),
      duration: Number(form.get("duration")) || 0,
      views: 0,
      likes: 0,
      dislikes: 0,
      isPublished: form.get("isPublished") === "true",
      owner,
      createdAt: new Date().toISOString(),
    };
    videos.unshift(video);
    return wait(video, 1200);
  },
};
