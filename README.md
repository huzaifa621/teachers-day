# Teachers' Day Postcard Portal

Local full-stack app: students submit tributes (message / video / PDF) to professors,
admins manage professors and download postcards to share.

## Run it

```bash
npm install
npm start
```

Open http://localhost:4173

- Student login: any name + institute.
- Admin login: password `admin123` (override with `ADMIN_PASSWORD=yourpass npm start`).

## What's inside

- `server/` — Express API, SQLite (`node:sqlite`, no native build step), file uploads (multer).
- `server/lib/postcard-template.js` + `postcard-layout.js` — the single postcard design,
  shared by every export so the PDF/PNG/video card always matches what's on screen.
- `server/lib/renderer.js` — Puppeteer renders the postcard to PDF/PNG.
- `server/lib/video-compositor.js` — ffmpeg composites the uploaded video into the postcard
  frame (crop-to-fill + overlay), producing one self-contained MP4 with the video actually
  playing inside the card.
- `public/` — frontend (vanilla JS, no build step).
- `data/app.db` — SQLite database (created on first run).
- `uploads/` — professor photos, submitted videos/PDFs, and generated exports.
- `assets/masai_logo.png` — the real Masai wordmark, pulled from masaischool.com, used
  everywhere the logo appears (postcard, stamp, header, favicon).

## Admin: sending tributes to professors

The "Send to Profs" tab lists every professor with a **combined PDF** of all their message
tributes, plus each video/PDF tribute individually (**PDF** and **Card** buttons). Video
cards are real MP4 files with the postcard frame baked around the playing video — download
and share over WhatsApp or email as-is.

## Notes

- No email sending is wired up — downloads only, by design (see chat).
- "Clear All" (Settings) wipes the database rows but leaves uploaded files on disk.
