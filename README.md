<div align="center">

# 🎬 VideoTube

**A YouTube-style video platform backend built with Node.js, Express, and MongoDB.**

Upload videos, manage users, and stream content — the server side of a video sharing app.

![Node.js](https://img.shields.io/badge/Node.js-ES%20Modules-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose%209-47A248?logo=mongodb&logoColor=white)
![Cloudinary](https://img.shields.io/badge/Cloudinary-Media%20Storage-3448C5?logo=cloudinary&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-000000?logo=jsonwebtokens&logoColor=white)
![Status](https://img.shields.io/badge/status-in%20development-orange)

</div>

---

## 📖 About

VideoTube is a learning project that rebuilds the core of a video platform like YouTube, starting with the backend. It focuses on the real-world pieces every production app needs:

- 🔐 **Secure authentication** with hashed passwords and access/refresh tokens
- ☁️ **Media uploads** handled by Multer and stored on Cloudinary
- 🗄️ **Clean data models** for users and videos in MongoDB
- 📄 **Pagination** for video feeds using aggregation pipelines
- 🧱 **Consistent API responses and errors** across every route

> 🚧 **Work in progress** — this is an MVP under active development. See the [Roadmap](#-roadmap) for what's done and what's next.

---

## ✨ Features

| Feature | Status |
|---|---|
| Express server with CORS, JSON & cookie parsing | ✅ Done |
| MongoDB connection with Mongoose | ✅ Done |
| User model — bcrypt password hashing, JWT access & refresh tokens | ✅ Done |
| Video model — owner, views, likes, publish state, pagination plugin | ✅ Done |
| File uploads (Multer → Cloudinary) | ✅ Done |
| Standard API response & error classes | ✅ Done |
| User registration | 🛠️ In progress |
| Login / logout / refresh token | 📋 Planned |
| Video upload, update, delete & feed | 📋 Planned |
| Comments, likes, subscriptions, watch history | 📋 Planned |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Runtime | [Node.js](https://nodejs.org/) (ES Modules) |
| Framework | [Express 5](https://expressjs.com/) |
| Database | [MongoDB](https://www.mongodb.com/) + [Mongoose 9](https://mongoosejs.com/) |
| Auth | [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) + [bcrypt](https://github.com/kelektiv/node.bcrypt.js) |
| File uploads | [Multer](https://github.com/expressjs/multer) |
| Media storage | [Cloudinary](https://cloudinary.com/) |
| Pagination | [mongoose-aggregate-paginate-v2](https://github.com/aravindnc/mongoose-aggregate-paginate-v2) |

---

## 📁 Project Structure

```
video-tube/
├── public/
│   └── temp/                    # Temporary storage for uploads before Cloudinary
├── src/
│   ├── index.js                 # Entry point: loads .env, connects DB, starts server
│   ├── app.js                   # Express app setup: middleware + routes
│   ├── constants.js             # Shared constants (database name)
│   ├── db/
│   │   └── index.js             # MongoDB connection
│   ├── models/
│   │   ├── user.models.js       # User schema, password hashing, JWT helpers
│   │   └── video.models.js      # Video schema + pagination plugin
│   ├── controllers/
│   │   └── user.controller.js   # Request handlers for user routes
│   ├── routes/
│   │   └── user.routes.js       # User API endpoints
│   ├── middlewares/
│   │   └── multer.middleware.js # Saves uploaded files to public/temp
│   └── utils/
│       ├── asynchandler.js      # Wraps async routes so errors reach Express
│       ├── APIerrors.js         # Standard error format
│       ├── APIresponse.js       # Standard success format
│       └── Cloudinary.js        # Uploads files to Cloudinary
├── .env                         # Your secrets (not committed)
└── package.json
```

---

## 🔄 How an Upload Works

```
  Client ──► Multer ──► public/temp ──► Cloudinary ──► URL saved in MongoDB
             (receive)   (temp file)     (store file)    (only the link)
```

Files are never stored in the database — MongoDB keeps only the Cloudinary URL, which keeps the database small and fast while Cloudinary serves media through its CDN.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (latest LTS recommended)
- A [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (free tier works)
- A [Cloudinary](https://cloudinary.com/) account (free tier works)

### 1. Clone the repository

```bash
git clone https://github.com/samchinmaya/video-tube.git
cd video-tube
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the project root:

```env
PORT=3000
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster-host>
CORS_ORIGIN=http://localhost:5173

ACCESS_TOKEN_SECRET=<long-random-string>
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=<another-long-random-string>
REFRESH_TOKEN_EXPIRY=10d

CLOUDINARY_CLOUD_NAME=<your-cloud-name>
API_KEY=<your-cloudinary-api-key>
API_SECRET=<your-cloudinary-api-secret>
```

> 💡 Generate strong secrets with:
> `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
>
> ⚠️ Don't add the database name to `MONGODB_URI` — the app appends `/Videotube` automatically.

### 4. Run the server

```bash
npm run dev     # development — restarts automatically on file changes
npm start       # production
```

You should see:

```
DB is Connect for <your-cluster-host>
the port is running at 3000
```

---

## 📡 API Reference

**Base URL:** `http://localhost:3000/api/v1`

### Users

| Method | Endpoint | Description | Status |
|---|---|---|---|
| `POST` | `/user/register` | Create a new account | 🛠️ In progress |
| `POST` | `/user/login` | Log in and receive tokens | 📋 Planned |
| `POST` | `/user/logout` | Log out and clear tokens | 📋 Planned |

### Response format

Every response follows the same shape:

```jsonc
// ✅ Success
{
  "statusCode": 200,
  "data": { },
  "message": "success",
  "success": true
}

// ❌ Error
{
  "statusCode": 400,
  "data": null,
  "message": "Something Went Wrong",
  "success": false,
  "errors": []
}
```

---

## 🗄️ Data Models

<details>
<summary><b>👤 User</b></summary>

| Field | Type | Notes |
|---|---|---|
| `username` | String | Unique, lowercase, indexed |
| `email` | String | Unique, lowercase |
| `fullname` | String | Required |
| `avatar` | String | Cloudinary URL, required |
| `coverImage` | String | Cloudinary URL |
| `watchHistory` | [ObjectId → Video] | Videos the user has watched |
| `password` | String | bcrypt-hashed, hidden from queries by default |
| `refreshToken` | String | Hidden from queries by default |

</details>

<details>
<summary><b>🎥 Video</b></summary>

| Field | Type | Notes |
|---|---|---|
| `videoFile` | String | Cloudinary URL, unique |
| `thumbnail` | String | Cloudinary URL |
| `title` | String | Required |
| `description` | String | Required |
| `duration` | Number | In seconds |
| `views` / `likes` / `dislikes` | Number | Default `0` |
| `isPublished` | Boolean | Default `false` |
| `owner` | ObjectId → User | Uploader |
| `comments` | [ObjectId → Comment] | |

</details>

---

## 🗺️ Roadmap

- [x] Project setup, database connection, and core utilities
- [x] User and Video models
- [x] File upload pipeline (Multer + Cloudinary)
- [ ] User registration with avatar upload
- [ ] Login, logout, and refresh-token rotation
- [ ] JWT auth middleware for protected routes
- [ ] Video upload, update, delete, and paginated feed
- [ ] Comments, likes, subscriptions, and playlists
- [ ] Watch history
- [ ] Frontend

---

## 🤝 Contributing

Contributions, ideas, and feedback are welcome!

1. Fork the repository
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

<div align="center">

Built with ❤️ by [samchinmaya](https://github.com/samchinmaya)

⭐ Star this repo if you find it helpful!

</div>
