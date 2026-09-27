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

### 📝 Register a user

`POST /api/v1/user/register` — send as **`multipart/form-data`** (in Postman: *Body → form-data*), because it includes image files.

| Field | Type | Required |
|---|---|---|
| `username` | Text | ✅ |
| `email` | Text | ✅ |
| `fullname` | Text | ✅ |
| `password` | Text | ✅ |
| `avatar` | File (image) | ✅ |
| `coverImage` | File (image) | ✅ |

> 📮 **Testing in Postman**
> - Put **all six fields** in *Body → form-data* — the text fields too.
> - Postman sends **only the selected body type**: if *form-data* is selected, anything in the *raw* JSON tab is ignored.
> - Switch the `avatar` and `coverImage` rows from **Text** to **File** and pick images from your computer — a link won't work.
> - Keys are case-sensitive: `fullname` (all lowercase), `coverImage` (capital **I**).

**What happens on the server, in order:**

```
1. Validate fields      → all text fields present and not empty
2. Check duplicates     → one query: username OR email already used?
3. Check files          → avatar and cover image received by Multer
4. Upload to Cloudinary → both images; temp files are deleted
5. Create the user      → password hashed by bcrypt before saving
6. Respond              → the new user, without password or refresh token
```

**Possible responses:**

| Status | When |
|---|---|
| `201` | User registered successfully |
| `400` | A text field is missing or empty, or the avatar / cover image is missing |
| `409` | The username or email is already registered |
| `500` | Image upload to Cloudinary failed |

> 💡 **Why check duplicates in the controller if the schema already has `unique: true`?**
> Both layers do different jobs:
> - **Controller check (step 2)** — catches duplicates *early* with a clear `409` message, and **before** the Cloudinary uploads, so no images are wasted on a sign-up that would fail.
> - **`unique: true` in the schema** — the final guarantee. It blocks the rare case of two identical sign-ups arriving at the same moment. On its own it would only produce a raw MongoDB `E11000` error (a confusing `500`) *after* the uploads.

### Response format

Responses are built with two helper classes in `src/utils/`:

```js
// ✅ Success — APIresponse sends itself with the right status code
return new APIresponse(201, user, "User registered successfully").json(res)

// ❌ Error — throw an APIError; asyncHandler passes it to Express
throw new APIError(400, "All fields are required")
```

They produce these shapes:

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

> ⚠️ A JSON error-handling middleware is not added yet, so thrown errors currently reach Express's default handler — it uses the right status code but replies with an **HTML** page. See the [Roadmap](#-roadmap).

---

## 🧰 Troubleshooting

| You see | Cause | Fix |
|---|---|---|
| `Cannot POST /register` (404) | Wrong URL | Use the full path: `http://localhost:3000/api/v1/user/register` |
| `All fields are required` (400) | A text field is missing or empty — often because it's in the *raw* tab while *form-data* is selected | Add `username`, `email`, `fullname`, `password` as **form-data** rows |
| `Avatar is required` (400) | The image was sent as Text or a link | Set the `avatar` row type to **File** and choose an image |
| `Avatar upload failed` (500) | Cloudinary rejected the upload — usually a wrong or cut-off `API_KEY` / `API_SECRET` (`unknown api_key`, 401) | Copy both from **Cloudinary Console → Settings → API Keys** into `.env`, check `CLOUDINARY_CLOUD_NAME`, then **restart the server** |
| `.env` change has no effect | `.env` is only read when the server starts; `node --watch` doesn't reload it | Stop the server (`ctrl + c`) and run `npm run dev` again |
| `ERR_MODULE_NOT_FOUND` | A relative import is missing `.js` (required with ES modules) | Write the full file name, e.g. `"../utils/asynchandler.js"` |
| Leftover files in `public/temp` | A request failed *before* the Cloudinary step, so the temp files weren't cleaned up | Delete them by hand (keep `.gitkeep`) — automatic cleanup is on the Roadmap |

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
- [ ] JSON error-handling middleware (+ automatic cleanup of `public/temp` on failed requests)
- [ ] Ignore uploaded files in git (`public/temp/*`, keep `.gitkeep`)
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
