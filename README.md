# Pulse LMS

A pragmatic role-based Learning Management System with three dashboards — **Admin**, **Batch Coordinator**, and **Student**. Real Express + MongoDB backend, real persistence, real-time doubts and chat, **Google Sign-In** for auth.

> Built as a learning project. Not enterprise — pragmatic.

## Stack

- **Client** (`/client`) — React + Vite + TypeScript, Tailwind + shadcn-style components, Framer Motion, React Router, TanStack Query, Axios, Socket.IO client, `@react-oauth/google`
- **Server** (`/server`) — Node + Express + TypeScript, Mongoose, zod, JWT, multer, Socket.IO, `google-auth-library`
- **DB** — MongoDB Atlas (remote, no docker)

## Quick start (Windows PowerShell, project at `D:\LMS`)

### 1. Set up Google OAuth credentials (~5 minutes, one-time)

You need an OAuth 2.0 **Web application** Client ID. If you've already done this, skip to step 2.

1. Go to <https://console.cloud.google.com/> and sign in.
2. Top bar → project dropdown → **New Project** → name it "Pulse LMS" → Create.
3. Left menu → **APIs & Services** → **OAuth consent screen**.
   - User type: **External** → Create.
   - App name: `Pulse LMS`. User support email + developer contact: your Gmail.
   - Scopes: skip (defaults are fine).
   - Test users: add `saihrudhay9@gmail.com` and any other Gmail addresses you'll test with.
   - Save and continue back to the dashboard.
4. Left menu → **APIs & Services** → **Credentials** → **+ Create Credentials** → **OAuth client ID**.
   - Application type: **Web application**.
   - Name: `Pulse LMS Web`.
   - **Authorized JavaScript origins**: add `http://localhost:5173`
   - **Authorized redirect URIs**: leave blank (we use Google Identity Services, not redirect flow).
   - Create. A modal will pop with your **Client ID** and **Client Secret** — copy both.
5. Paste them into `server/.env`:
   ```
   GOOGLE_CLIENT_ID=...apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-...
   ```
   And the **Client ID only** into `client/.env`:
   ```
   VITE_GOOGLE_CLIENT_ID=...apps.googleusercontent.com
   ```

> The OAuth consent screen starts in **Testing** mode. Until you publish it, only emails listed in **Test users** can sign in — that's actually what you want here.

### 2. Install dependencies

```powershell
# server
cd D:\LMS\server
npm install

# client
cd D:\LMS\client
npm install
```

### 3. First run

```powershell
# Terminal 1: server
cd D:\LMS\server
npm run seed         # idempotent — only ensures the admin row exists
npm run dev          # http://localhost:5000

# Terminal 2: client
cd D:\LMS\client
npm run dev          # http://localhost:5173
```

Open <http://localhost:5173>, click **Sign in with Google**, and authenticate as `saihrudhay9@gmail.com`. You'll land on the admin dashboard.

From there, you add coordinators and students by their **Gmail addresses** (Users page → Add user → role = coordinator or student). Those people then sign in with that same Gmail.

## Auth model

- **Sign-in is Google-only.** No passwords, no self-signup form.
- **Accounts must exist in the DB to log in.** The server verifies the Google ID token, then looks up the verified email. If it's not in the users collection → 403 "Please ask the admin to provision your access".
- **There is exactly one admin** — the email in `ADMIN_EMAIL` (default `saihrudhay9@gmail.com`). The very first time that email signs in, the server auto-creates the admin row. Everyone else must be added first.
- Profile (name + avatar) syncs from Google on each login.

### How the verification works

1. Client renders the Google button (`@react-oauth/google`).
2. User signs in via Google popup → Google returns a signed **ID token** (a JWT).
3. Client POSTs the ID token to `POST /api/auth/google`.
4. Server uses `google-auth-library` to verify the token's signature against Google's public keys, checks the audience matches `GOOGLE_CLIENT_ID`, and extracts the email.
5. Server looks the email up, issues **our** JWT (the same one used everywhere else), client stores it.

The `AuthProvider` interface in `server/src/auth/` keeps the abstraction — `MockAuthProvider` is still available for offline dev (set `AUTH_PROVIDER=mock` in `.env`).

## Environment

`server/.env` (full reference in `server/.env.example`):

```
MONGODB_URI=...
JWT_SECRET=...
JWT_EXPIRES_IN=7d
PORT=5000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
AUTH_PROVIDER=google
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
ADMIN_EMAIL=saihrudhay9@gmail.com
```

`client/.env`:

```
VITE_GOOGLE_CLIENT_ID=...
```

> Some networks block SRV DNS lookups (Atlas needs them). `server/src/config/db.ts` overrides Node's DNS with public resolvers as a workaround — harmless if your network already resolves SRV records.

## Features by role

### Admin (`saihrudhay9@gmail.com`)
- Overview stats
- Batch CRUD + archive + cascade hard-delete
- Users page — add coordinators/students by Gmail, search, paginate, move students between batches, delete users (with cascade)

### Coordinator
- Overview of own batches with switcher
- Content manager — upload PDFs/docs, embed video & link URLs, delete with confirm
- Doubt inbox — view thread, reply, mark resolved; live badge + toast on new doubt
- Student roster — add students directly (creates the account if the email is new, or enrolls an existing batchless student), remove students
- 1:1 chat

### Student
- Welcome dashboard scoped to their batch
- Content view — grouped by type, searchable, inline PDF & YouTube viewers
- Raise + track doubts
- Batchmate roster
- 1:1 chat with unread/read state

## Data model

```
users          email* (unique), fullName, avatarUrl, role, batchId?, isActive
batches        name, description, coordinatorId?, isArchived
materials      batchId, type (document|video|link), title, description, filePath|externalUrl, uploadedBy
doubts         batchId, studentId, materialId?, title, description, status, responses[], resolvedAt
messages       batchId, senderId, recipientId, body, readAt
notifications  userId, type, payload, isRead
```

**Single-batch rule** — students always have one `batchId`; admins/coordinators never have one. Enforced on the user model's pre-validate hook and at every write boundary.

## Real-time

Socket.IO with JWT handshake. Users are auto-joined to `user:<id>`, `role:<role>`, and `batch:<id>` rooms.

- New doubt → notify coordinator (toast + persisted `Notification`)
- New reply → notify the other party
- New message → push to recipient, bump unread badge

## Persistence & audit logging

Every edit/delete hits MongoDB and persists across refreshes. The server prints an `[audit]` line for every write so you can confirm in the dev terminal:

```
[audit] material deleted id=... batch=... by=...
[audit] batch.archive by=... { batchId: ... }
[audit] batch.hardDelete by=... { batchId: ..., materialsDeleted: 3, ... }
[audit] user.delete by=... { userId: ..., doubtsDeleted: 2, ... }
[audit] doubt.resolve id=... by=...
```

### Hard vs soft delete

- **Batches** — Archive sets `isArchived: true` (recoverable). On an archived batch, a separate **Delete** button does a true `deleteMany` of the batch + its materials, doubts, and messages, plus unenrolls students.
- **Materials, Doubts, Users** — hard delete only, with confirmation modal.
- **Coordinator removes student from batch** — does NOT delete the account; it just clears the student's `batchId`.

### About `npm run seed`

- It's **idempotent by default** — only ensures the admin row exists. Safe to re-run.
- Pass `--reset` to wipe every collection (`npm run seed -- --reset`). Use this when you want a totally clean slate.

## Repo layout

```
D:/LMS
├── README.md
├── .gitignore
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env             # local only (gitignored)
│   ├── .env.example
│   ├── uploads/         # multer destination
│   └── src/
│       ├── index.ts
│       ├── app.ts
│       ├── config/      # env, db
│       ├── auth/        # provider interface, Google + Mock providers, jwt
│       ├── middleware/  # auth, error
│       ├── models/      # User, Batch, Material, Doubt, Message, Notification
│       ├── realtime/    # Socket.IO setup
│       ├── routes/      # auth, admin, coordinator, batches, materials, doubts, messages, notifications, health
│       └── seed/
└── client/
    ├── .env             # VITE_GOOGLE_CLIENT_ID
    ├── .env.example
    ├── package.json
    ├── vite.config.ts   # proxies /api + /socket.io + /uploads → :5000
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── main.tsx     # wraps with GoogleOAuthProvider
        ├── App.tsx
        ├── index.css
        ├── auth/        # GoogleAuthProvider, guards, hooks
        ├── components/  # ui/, layout/
        ├── hooks/       # useSocket, useBatches
        ├── lib/         # api (axios), socket, theme, utils
        └── pages/
            ├── admin/       # Overview, Batches, Users
            ├── coordinator/ # Overview, Content, Roster
            ├── student/     # Overview, Content, Roster
            ├── doubts/      # shared DoubtsPage
            ├── chat/        # shared ChatPage
            └── Login.tsx    # Sign in with Google
```

## Scripts

### Server
- `npm run dev` — tsx watch
- `npm run seed` — ensure admin exists (idempotent)
- `npm run seed -- --reset` — wipe everything, then seed admin
- `npm run build` — tsc to `dist/`
- `npm start` — run compiled build
- `npm run typecheck` — type-only

### Client
- `npm run dev` — Vite dev
- `npm run build` — typecheck + build
- `npm run preview` — preview built output

## Troubleshooting

- **"This Google account has not been added to Pulse LMS"** — that Gmail isn't in the users collection. Sign in as the admin first and add it via Users → Add user.
- **"Google sign-in isn't configured yet"** banner on the login page — `VITE_GOOGLE_CLIENT_ID` is missing or still `replace-...` in `client/.env`. Update and restart `npm run dev`.
- **"redirect_uri_mismatch" / "origin not allowed"** from Google popup — your Google Cloud OAuth client doesn't list `http://localhost:5173` as an authorized JavaScript origin. Add it and save.
- **Admin sign-in fails with "not provisioned"** even though the email matches — check that `ADMIN_EMAIL` in `server/.env` matches your Google email exactly (case-insensitive). Restart the server after edits.
- **Audit log shows the delete but the row still appears after refresh** — you probably ran `npm run seed -- --reset` in another terminal. The default `npm run seed` is now idempotent and won't wipe.

## Roadmap (out of scope for this build)

- Per-doubt notifications page + unread badge on the sidebar
- Push notifications, attachments in chat, group rooms
- Custom domain + publishing OAuth consent screen for production
