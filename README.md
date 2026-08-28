# Teachers' Day Postcard Portal

Students submit tributes (message / video / PDF) to faculty; admins manage faculty
and download postcards to share. Now split into two separately deployable projects:

- `backend/` — Express API. Data in MongoDB, files in a Supabase Storage bucket.
- `frontend/` — Next.js (App Router) UI, talks to the backend over HTTP with cookie-based sessions.

## Run it locally

**Backend**
```bash
cd backend
npm install
cp .env.example .env   # fill in MONGODB_URI, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, etc.
npm start
```
Runs at http://localhost:4173.

**Frontend**
```bash
cd frontend
npm install
npm run dev
```
Runs at http://localhost:3000 and calls the backend via `NEXT_PUBLIC_API_URL` (see `frontend/.env.local`).

- **Student link**: `/` — name + institute (dropdown, see Institutes below). No admin option shown.
- **Admin link**: `/admin` — password from `ADMIN_PASSWORD` in `backend/.env`. Not linked from `/`
  anywhere; share it separately with admins only.
- A session tied to one role visiting the other route sees a "Wrong Portal" screen with a logout
  button, rather than silently working — the two roles are fully separate sessions.

## Institutes

The institute list (used by the student-login dropdown, the Add Faculty picker, and to
filter which faculty a student sees) is a single hardcoded list in
`backend/src/lib/institutes.js`, served publicly at `GET /api/institutes`. Update it there when
the official list changes — no other code needs to change. Students only ever see faculty
belonging to the institute they logged in with.

## Data & storage

- **MongoDB** holds `faculty` (institutes, name, email, photo) and `submissions`
  (message/video tribute, target faculty, moderation `status`) collections
  (see `backend/src/lib/store.js`).
- **Supabase Storage** holds faculty photos, submitted videos/PDFs, and generated postcard
  exports, in a single bucket under `photos/`, `videos/`, `pdfs/`, `generated/` prefixes
  (see `backend/src/lib/storage.js`). The bucket is expected to be **public** — matches the
  old app's behavior where uploaded files were served without auth (only the API metadata
  was gated).

## Moderation (Approve / Reject)

Every submitted tribute starts as `status: "pending"`. Admins review tributes in the Gallery tab
(grouped by institute) and Approve or Reject each one — invisible to students, who only ever see
their own submitted-successfully confirmation (with immediate download links) and, in the shared
Gallery, only tributes that have been approved. Only **approved** tributes count toward a
faculty's combined PDF / appear in the Send-to-Faculty media list — pending or rejected ones are
excluded there even though an admin can still see and moderate them from the Gallery.

## Rendering pipeline

- `backend/src/lib/postcard-template.js` + `postcard-layout.js` — the single postcard design,
  shared by every export so the PDF/PNG/video card always matches what's on screen.
- `backend/src/lib/renderer.js` — Puppeteer renders the postcard to PDF/PNG.
- `backend/src/lib/video-compositor.js` — ffmpeg composites an uploaded video (downloaded
  from Supabase to local scratch space) into the postcard frame, producing one self-contained
  MP4 which is uploaded back to Supabase and cached there for future downloads.

## Deploying

Both projects deploy to Railway, as two separate services in the same Railway project (one
GitHub repo, `Root Directory` set per-service to `backend` and `frontend`). No Vercel involved.

- **Backend**: always-on Node host — Puppeteer + ffmpeg video compositing are heavier/longer-running
  than a typical API route, which is also why it's not serverless. Set all vars from
  `backend/.env.example`, including `FRONTEND_ORIGIN` (the deployed frontend's Railway URL) and
  `NODE_ENV=production` (switches session cookies to `SameSite=None; Secure`, required for
  cross-origin cookies).
- **Frontend**: plain `next build` / `next start` (no static export), so it also runs as a normal
  Railway Node service. Set `NEXT_PUBLIC_API_URL` to the deployed backend's Railway URL.

Since each service's URL depends on the other, deploy both once to get their Railway-generated
domains, then set `FRONTEND_ORIGIN` (backend) and `NEXT_PUBLIC_API_URL` (frontend) to point at
each other's real URLs and redeploy both.

## Admin: sending tributes to faculty

The "Send to Faculty" tab lists every faculty (grouped by institute) with a **combined PDF** of
their approved message tributes, plus each approved video/PDF tribute individually (**PDF** and
**Card** buttons), a **Preview** button (slider through that faculty's approved tributes), and
a checkbox + email template textarea + Send button. The email template/checkbox/Send UI is a
placeholder for now — nothing is persisted or sent; Send just confirms your selection. Real
sending will be wired up once Google account integration is added. Video cards are real MP4
files with the postcard frame baked around the playing video — download and share over WhatsApp
or email as-is.

## Notes

- No email sending is wired up yet — downloads (and the Send-to-Faculty placeholder above) only.
- There is no bulk "clear all data" control in the UI. Clearing data means going into
  MongoDB/Supabase directly.
- Sessions are stored signed in the cookie itself (no server-side session store), since
  multiple backend instances shouldn't need to share session memory.
