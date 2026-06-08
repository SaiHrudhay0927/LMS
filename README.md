<<<<<<< HEAD
# LMS
A full-stack MERN learning management system with role-based dashboards for admins, batch coordinators, and students — featuring batch management, course content, doubt resolution, and real-time chat.
=======
# Pulse LMS

A pragmatic role-based Learning Management System with three dashboards — **Admin**, **Batch Coordinator**, and **Student**. Real Express + MongoDB backend, real persistence, real-time doubts and chat.

> Built as a learning project. Not enterprise — pragmatic.

## Stack

- **Client** (`/client`) — React + Vite + TypeScript, Tailwind + shadcn-style components, Framer Motion, React Router, TanStack Query, Axios, Socket.IO client
- **Server** (`/server`) — Node + Express + TypeScript, Mongoose, zod, JWT, multer, Socket.IO
- **DB** — MongoDB Atlas (remote, no docker)

## Quick start (Windows PowerShell, project at `D:\LMS`)

### 1. Server

```powershell
cd D:\LMS\server
npm install
npm run seed     # creates demo users, batches, materials, doubts, messages
npm run dev      # http://localhost:5000
```

### 2. Client (in a second terminal)

```powershell
cd D:\LMS\client
npm install
npm run dev      # http://localhost:5173
```

Open <http://localhost:5173>. You'll land on a login screen with a **Demo accounts** panel — click any seeded user to enter their dashboard. The header has a **Switch user** dropdown so you can hop between roles instantly.

## Seeded accounts

| Email                | Role        | Notes                                |
| -------------------- | ----------- | ------------------------------------ |
| `admin@pulse.dev`    | admin       | Sees everything                      |
| `maria@pulse.dev`    | coordinator | Owns _Fullstack Engineering — C7_    |
| `kenji@pulse.dev`    | coordinator | Owns _Data Science — C4_             |
| `leo@pulse.dev`      | student     | Fullstack cohort                     |
| `mei@pulse.dev`      | student     | Fullstack cohort                     |
| `aria@pulse.dev`     | student     | Fullstack cohort                     |
| `jonas@pulse.dev`    | student     | Fullstack cohort                     |
| `noor@pulse.dev`     | student     | Data Science cohort                  |
| `zara@pulse.dev`     | student     | Data Science cohort                  |
| `theo@pulse.dev`     | student     | Data Science cohort                  |

## Environment

`server/.env` (already populated for the dev DB) — `server/.env.example` mirrors the shape.

```
MONGODB_URI=...
JWT_SECRET=...
JWT_EXPIRES_IN=7d
PORT=5000
FRONTEND_URL=http://localhost:5173
AUTH_PROVIDER=mock          # 'mock' or 'google'
GOOGLE_CLIENT_ID=replace-me # OAuth comes later
GOOGLE_CLIENT_SECRET=replace-me
```

> Some networks block SRV DNS lookups (Atlas needs them). `server/src/config/db.ts` overrides Node's DNS with public resolvers to work around this — if your network already resolves SRV records normally, it's harmless.

## Auth

No passwords, no self-signup. An account only exists if it's in the DB.

- Login flow is mocked but lives behind an `AuthProvider` interface
  - `server/src/auth/MockAuthProvider.ts` — trusts the email payload from the client
  - `server/src/auth/GoogleAuthProvider.ts` — stub; will verify Google ID tokens and return the same JWT
  - Switch by editing `AUTH_PROVIDER` in `.env`
- Client mirror lives in `client/src/auth/` — change one line in `client/src/auth/provider.ts` to swap

The server looks the email up in the users collection and issues a JWT. The frontend stores it and routes based on `role`. Routes are protected by `requireAuth` + `requireRole(...)` on the server — the client never decides what data you can see.

## Features by role

### Admin
- Overview stats
- Batch CRUD + archive, assign coordinator
- Add coordinator by email (via "Add user" with role = coordinator), enroll/move students with the single-batch rule
- Searchable, paginated user and batch tables

### Coordinator
- Overview of own batches with switcher
- Content manager — upload PDFs/docs (multer), embed video & link URLs
- Doubt inbox — view thread, reply, mark resolved; live badge + toast on new doubt
- Student roster

### Student
- Welcome dashboard scoped to their batch
- Content view — grouped by type, searchable, with inline PDF & YouTube viewers
- Raise + track doubts
- Batchmate roster
- Real-time 1:1 chat with unread/read state

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

- New doubt → notify coordinator (toast + persisted `Notification` + invalidate)
- New reply → notify the other party
- New message → push to recipient, bump unread badge

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
│       ├── auth/        # provider interface, mock + google, jwt
│       ├── middleware/  # auth, error, validation
│       ├── models/      # User, Batch, Material, Doubt, Message, Notification
│       ├── realtime/    # Socket.IO setup
│       ├── routes/      # auth, admin, batches, materials, doubts, messages, notifications, health
│       └── seed/        # npm run seed
└── client/
    ├── package.json
    ├── vite.config.ts   # proxies /api + /socket.io + /uploads → :5000
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── index.css
        ├── auth/        # AuthProvider abstraction, guards, hooks
        ├── components/  # ui/, layout/
        ├── hooks/       # useSocket, useBatches
        ├── lib/         # api (axios), socket, theme, utils
        └── pages/
            ├── admin/       # Overview, Batches, Users
            ├── coordinator/ # Overview, Content, Roster
            ├── student/     # Overview, Content, Roster
            ├── doubts/      # shared DoubtsPage
            ├── chat/        # shared ChatPage
            └── Login.tsx
```

## Scripts

### Server
- `npm run dev` — tsx watch
- `npm run seed` — wipe + reseed demo data
- `npm run build` — tsc to `dist/`
- `npm start` — run compiled build
- `npm run typecheck` — type-only

### Client
- `npm run dev` — Vite dev
- `npm run build` — typecheck + build
- `npm run preview` — preview built output

## Notes

- Tailwind + a small handcrafted shadcn-flavored component layer (no installer needed)
- Dark mode persists per-browser (toggled in the header)
- Toasts via Sonner
- Animations via Framer Motion — focused on transitions and feedback, not noise

### Persistence & audit logging

All edits and deletes hit MongoDB and persist across refreshes. The server prints an `[audit]` line for every write so you can confirm in the dev terminal:

```
[audit] material deleted id=... batch=... by=...
[audit] batch.archive by=... { batchId: ... }
[audit] batch.hardDelete by=... { batchId: ..., materialsDeleted: 3, ... }
[audit] user.delete by=... { userId: ..., doubtsDeleted: 2, ... }
[audit] doubt.resolve id=... by=...
```

> **`npm run seed` wipes every collection** and reseeds — if your data "comes back" after a deletion, check whether the seed script was re-run. It prints a banner so you'll notice.

### Hard vs soft delete

- **Batches** — the Archive action sets `isArchived: true` (recoverable). On an archived batch, a separate **Delete** button does a true `deleteMany` of the batch + its materials, doubts, and messages, plus unenrolls students.
- **Materials, Doubts, Users** — hard delete only. Confirmation dialog before each.
- **Coordinator removes a student from a batch** — does NOT delete the account; it just clears the student's `batchId`.

## Roadmap (out of scope for this build)

- Real Google OAuth — `AUTH_PROVIDER=google` swaps providers; the rest of the stack is unchanged
- Per-doubt notifications page + unread badge on the sidebar
- Push notifications, attachments in chat, group rooms
>>>>>>> 489d4de (Initial LMS project upload)
