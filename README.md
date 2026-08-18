# Teachers' Day Postcard Portal

Students submit tributes (message / video / PDF) to professors; admins manage professors
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

- Student login: any name + institute.
- Admin login: password from `ADMIN_PASSWORD` in `backend/.env` (defaults to `admin123`).

## Data & storage

- **MongoDB** holds `professors` and `submissions` collections (see `backend/src/lib/store.js`).
- **Supabase Storage** holds professor photos, submitted videos/PDFs, and generated postcard
  exports, in a single bucket under `photos/`, `videos/`, `pdfs/`, `generated/` prefixes
  (see `backend/src/lib/storage.js`). The bucket is expected to be **public** — matches the
  old app's behavior where uploaded files were served without auth (only the API metadata
  was gated).

## Rendering pipeline

- `backend/src/lib/postcard-template.js` + `postcard-layout.js` — the single postcard design,
  shared by every export so the PDF/PNG/video card always matches what's on screen.
- `backend/src/lib/renderer.js` — Puppeteer renders the postcard to PDF/PNG.
- `backend/src/lib/video-compositor.js` — ffmpeg composites an uploaded video (downloaded
  from Supabase to local scratch space) into the postcard frame, producing one self-contained
  MP4 which is uploaded back to Supabase and cached there for future downloads.

## Deploying

- **Backend**: intended for an always-on Node host (e.g. Railway) rather than serverless —
  Puppeteer + ffmpeg video compositing are heavier/longer-running than a typical API route.
  Set all vars from `backend/.env.example`, including `FRONTEND_ORIGIN` (the deployed
  frontend's URL) and `NODE_ENV=production` (switches session cookies to
  `SameSite=None; Secure`, required for cross-origin cookies).
- **Frontend**: deploy as a normal Next.js app (e.g. Vercel). Set `NEXT_PUBLIC_API_URL` to
  the deployed backend's URL.

## Admin: sending tributes to professors

The "Send to Profs" tab lists every professor with a **combined PDF** of all their message
tributes, plus each video/PDF tribute individually (**PDF** and **Card** buttons). Video
cards are real MP4 files with the postcard frame baked around the playing video — download
and share over WhatsApp or email as-is.

## Notes

- No email sending is wired up — downloads only, by design.
- "Clear All" (Settings) wipes the MongoDB collections but leaves uploaded files in Supabase Storage.
- Sessions are stored signed in the cookie itself (no server-side session store), since
  multiple backend instances shouldn't need to share session memory.
