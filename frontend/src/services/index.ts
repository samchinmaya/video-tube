import { api } from "../lib/api";
import { mock } from "../lib/mock";
import type { Channel, Comment, Owner, Paginated, User, Video } from "../lib/types";

// The backend has no video/comment/like/history routes yet. Until it does,
// those calls are served from lib/mock.ts. Flip this to false once they exist;
// the real endpoint each call expects is written next to it.
const USE_MOCK_VIDEOS = true;

const isMockId = (id: string) => id.startsWith("mock-");

export const authService = {
  login(identifier: string, password: string) {
    const id = identifier.trim().toLowerCase();
    const body = id.includes("@") ? { email: id, password } : { username: id, password };
    return api<{ user: User; accessToken: string }>("/user/login", { method: "POST", body });
  },
  register: (form: FormData) => api<User>("/user/register", { method: "POST", body: form }),
  logout: () => api<object>("/user/logout", { method: "POST" }),
  currentUser: () => api<{ user: User }>("/user/current-user"),
};

export const userService = {
  updateAccount: (body: { fullname?: string; email?: string }) =>
    api<{ user: User }>("/user/update-account", { method: "PUT", body }),

  changePassword: (body: { oldPassword: string; newPassword: string; confPassword: string }) =>
    api<object>("/user/change-password", { method: "PUT", body }),

  updateAvatar(file: File) {
    const form = new FormData();
    form.append("avatar", file);
    return api<{ avatar: string }>("/user/update-avatar", { method: "PUT", body: form });
  },

  updateCoverImage(file: File) {
    const form = new FormData();
    form.append("coverImage", file);
    return api<{ coverImage: string }>("/user/update-cover-image", { method: "PUT", body: form });
  },

  async getChannel(username: string): Promise<Channel> {
    const mockChannel = mock.getChannel(username);
    if (mockChannel) return { ...mockChannel };
    const { channel } = await api<{ channel: Channel }>(`/user/c/${encodeURIComponent(username)}`);
    return channel;
  },
};

export const subscriptionService = {
  toggle(channelId: string) {
    if (isMockId(channelId)) return mock.toggleSubscription(channelId);
    return api<{ subscribed: boolean }>(`/subscriptions/c/${channelId}`, { method: "POST" });
  },
  // GET /subscriptions/u/:subscriberId
  subscribedChannels: (): Channel[] => mock.subscribedChannels(),
};

export const videoService = {
  // GET /videos?page=&limit=&query=
  list({ page = 1, limit = 12, query = "" } = {}): Promise<Paginated<Video>> {
    if (USE_MOCK_VIDEOS) return mock.listVideos(page, limit, query);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (query) params.set("query", query);
    return api(`/videos?${params}`);
  },

  // GET /videos/:videoId
  get(id: string): Promise<Video & { isLiked?: boolean }> {
    if (USE_MOCK_VIDEOS || isMockId(id)) return mock.getVideo(id);
    return api(`/videos/${id}`);
  },

  // GET /videos?username=
  byChannel(username: string): Promise<Video[]> {
    if (USE_MOCK_VIDEOS) return mock.channelVideos(username);
    return api<Paginated<Video>>(`/videos?username=${encodeURIComponent(username)}&limit=50`).then((p) => p.docs);
  },

  // POST /videos  (multipart: videoFile, thumbnail, title, description, isPublished)
  upload(form: FormData, owner: Owner): Promise<Video> {
    if (USE_MOCK_VIDEOS) return mock.upload(form, owner);
    return api("/videos", { method: "POST", body: form });
  },

  // GET /user/history
  history: (): Promise<Video[]> => (USE_MOCK_VIDEOS ? mock.history() : api("/user/history")),

  // GET /likes/videos
  liked: (): Promise<Video[]> => (USE_MOCK_VIDEOS ? mock.likedVideos() : api("/likes/videos")),

  // POST /likes/toggle/v/:videoId
  toggleLike(id: string): Promise<{ isLiked: boolean }> {
    if (USE_MOCK_VIDEOS || isMockId(id)) return mock.toggleLike(id);
    return api(`/likes/toggle/v/${id}`, { method: "POST" });
  },

  // GET /videos/subscriptions
  subscriptionFeed: (): Promise<Video[]> => (USE_MOCK_VIDEOS ? mock.subscriptionFeed() : api("/videos/subscriptions")),
};

export const commentService = {
  // GET /comments/:videoId
  list(videoId: string): Promise<Comment[]> {
    if (USE_MOCK_VIDEOS || isMockId(videoId)) return mock.comments(videoId);
    return api<Paginated<Comment>>(`/comments/${videoId}`).then((p) => p.docs);
  },

  // POST /comments/:videoId
  add(videoId: string, content: string, owner: Owner): Promise<Comment> {
    if (USE_MOCK_VIDEOS || isMockId(videoId)) return mock.addComment(videoId, content, owner);
    return api(`/comments/${videoId}`, { method: "POST", body: { content } });
  },
};
