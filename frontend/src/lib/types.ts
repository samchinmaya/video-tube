// Shapes mirror the Mongoose models in ../../src/models

export interface User {
  _id: string;
  username: string;
  email: string;
  fullname: string;
  avatar: string;
  coverImage?: string;
  createdAt?: string;
}

export interface Owner {
  _id: string;
  username: string;
  fullname: string;
  avatar: string;
}

// Response of the channel profile aggregation in user.controller.js
export interface Channel extends Owner {
  coverImage?: string;
  email?: string;
  subscriptionCount: number;
  subscribedToCount: number;
  isSubscribed: boolean;
  description?: string;
}

export interface Video {
  _id: string;
  videoFile: string;
  thumbnail: string;
  title: string;
  description: string;
  duration: number;
  views: number;
  likes: number;
  dislikes: number;
  isPublished: boolean;
  owner: Owner;
  createdAt: string;
}

export interface Comment {
  _id: string;
  content: string;
  owner: Owner;
  likes: number;
  createdAt: string;
}

// Shape returned by mongoose-aggregate-paginate-v2
export interface Paginated<T> {
  docs: T[];
  totalDocs: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
}
