# AWS Deployment Plan — Teachers' Day Postcard Portal

## Architecture

Single EC2 instance running both services in Docker containers, with Nginx in front handling TLS and routing by path — so frontend and backend end up **same-origin** under one domain. That's a meaningful simplification over the current Railway setup: no more cross-site cookies (`SameSite=None`), no CORS config, one TLS cert, one DNS record.

```
Internet → Route 53 (DNS) → EC2 (Elastic IP)
                              └─ Nginx :80/:443 (TLS via Let's Encrypt)
                                   ├─ /api/*  → backend container  (Node/Express, :4173)
                                   └─ /*      → frontend container (Next.js,    :3001)
Backend  → MongoDB Atlas (unchanged, already AWS-region-hosted)
Backend  → S3 bucket (photos/videos/generated — replaces Supabase Storage)
```

Starting fresh — no existing data/files to migrate. Mongo Atlas keeps its data as-is; Supabase Storage is simply replaced by a new, empty S3 bucket that all new uploads go to from day one.

## Why EC2, not Fargate/Lambda

The backend needs Puppeteer (headless Chromium) + ffmpeg doing real CPU work (PDF/PNG render, video→GIF compositing, ~1-5s each). That rules out Lambda (package size, cold starts, timeout). A single EC2 box is the right size for this app's actual traffic (a campus event tool, not a scaled SaaS) — cheaper and simpler to operate than ECS+ALB+Amplify.

**Instance size:** `t3.medium` (2 vCPU / 4GB RAM). Chromium + ffmpeg + Node + Next.js concurrently need headroom; `t3.small` (2GB) will swap under load during GIF generation.

---

## Step 1 — Switch storage: Supabase → S3

Storage is already isolated behind one module (`backend/src/lib/storage.js`) with a clean interface (`uploadBuffer`, `uploadBufferAt`, `publicUrl`, `downloadBuffer`, `remove`). Since we're starting fresh (no data to carry over), this is a pure code swap, no migration script:

1. Create an S3 bucket, public-read on objects (matches current Supabase bucket policy — the API gates metadata, not raw file access). ✅ done — see "S3 bucket setup" below.
2. Rewrite `storage.js` using `@aws-sdk/client-s3` — same five exported functions, same signatures, so **zero changes needed in any route/lib that calls it**. ✅ done.
3. Deploy pointed at the new bucket. All uploads (professor photos, student videos, generated postcards/GIFs) go to S3 from the first request onward.

New env vars replacing `SUPABASE_*`: `AWS_REGION`, `S3_BUCKET`, plus IAM credentials (see Step 4 — prefer an instance role over static keys).

### S3 bucket setup

Bucket names are globally unique across all of AWS, so `teachers-day-uploads` may be taken — pick something specific, e.g. `teachers-day-uploads-<yourname>` or `<company>-teachers-day-uploads`.

**Console:**
1. S3 → Create bucket → name it, pick a region (match wherever you'll run EC2, e.g. `ap-south-1` for lowest latency to India).
2. Under **Block Public Access settings**, uncheck "Block all public access" (needed since we're granting access via bucket policy, not ACLs) → acknowledge the warning.
3. After creation, go to the bucket's **Permissions** tab → **Bucket policy** → paste in `infra/s3-bucket-policy.json` (from this repo) with `REPLACE_BUCKET_NAME` swapped for your real bucket name.

**CLI equivalent** (once `aws configure` is set up):
```bash
BUCKET=your-bucket-name
REGION=ap-south-1

aws s3api create-bucket --bucket "$BUCKET" --region "$REGION" \
  --create-bucket-configuration LocationConstraint="$REGION"

aws s3api put-public-access-block --bucket "$BUCKET" --public-access-block-configuration \
  BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false

sed "s/REPLACE_BUCKET_NAME/$BUCKET/" infra/s3-bucket-policy.json > /tmp/bucket-policy.json
aws s3api put-bucket-policy --bucket "$BUCKET" --policy file:///tmp/bucket-policy.json
```

**IAM access for local dev** (before EC2 exists, you need something to authenticate as while testing locally): create an IAM user (e.g. `teachers-day-dev`), attach an inline/custom policy from `infra/s3-app-iam-policy.json` (same `REPLACE_BUCKET_NAME` swap — this is deliberately scoped to only `GetObject`/`PutObject`/`DeleteObject` on this one bucket, nothing account-wide), generate an access key pair for that user, then either run `aws configure` or set `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` env vars locally. In production on EC2, this same policy gets attached to the **instance role** instead (Step 3) — no long-lived keys needed there at all.

Once the bucket exists, set in `backend/.env`:
```
AWS_REGION=ap-south-1
S3_BUCKET=your-bucket-name
```

---

## Step 2 — Dockerize both services ✅ done

- **`backend/Dockerfile`** — `node:22-slim` + system Chromium (apt) for Puppeteer, pointed at via `PUPPETEER_EXECUTABLE_PATH` + `PUPPETEER_SKIP_DOWNLOAD=true` (skips Puppeteer's own Chromium download — smaller image, no code change needed, `puppeteer.launch()` already respects that env var). ffmpeg needs no apt package — `ffmpeg-static` ships its own binary.
- **`frontend/Dockerfile`** — 3-stage build (`deps` → `builder` → `runner`) using Next.js `output: 'standalone'` (set in `next.config.js`) for a minimal final image. Takes `NEXT_PUBLIC_API_URL` as a build ARG, defaulting to `""` since production is same-origin behind Nginx. Verified locally: `next build` + running the standalone `server.js` directly serves the root page, CSS, static assets, and `/masai-admin` correctly.
- **`docker-compose.yml`** at repo root ties both together, `restart: unless-stopped`, ports bound to `127.0.0.1` only (Nginx is the sole public entry point — see Step 4). Env vars come from a root `.env` file (see `.env.example`), not committed.
- Fixed one real bug this surfaced: `frontend/lib/api.js` used `NEXT_PUBLIC_API_URL || 'http://localhost:4173'` — with `||`, an intentionally-empty string (what same-origin prod needs) would've silently fallen back to `localhost:4173`. Changed to `??`.

---

## Step 3 — Provision the EC2 instance

Do these in order — the IAM role and security group are referenced *during* instance launch, so creating them first avoids a rework step.

### 3a. IAM role (console: IAM → Roles → Create role)
- Trusted entity type: **AWS service** → Use case: **EC2** → Next.
- Attach the same customer-managed policy you already created for the dev IAM user (`teachers-day-s3-access`, from `infra/s3-app-iam-policy.json`) — no need to author it again, just search and select it.
- Name the role e.g. `teachers-day-ec2-role` → Create.

### 3b. Security group (console: EC2 → Security Groups → Create security group)
Inbound rules only (outbound stays default-allow-all):

| Type | Port | Source |
|---|---|---|
| SSH | 22 | Your IP only (`My IP` in the console) |
| HTTP | 80 | Anywhere (0.0.0.0/0) |
| HTTPS | 443 | Anywhere (0.0.0.0/0) |

Nothing else — 4173/3001 never appear here since `docker-compose.yml` already binds them to `127.0.0.1` only.

### 3c. Launch the instance (console: EC2 → Launch instance)
- AMI: **Ubuntu Server 22.04 LTS**.
- Instance type: **t3.medium**.
- Key pair: create/select one — you'll need the `.pem` to SSH in.
- Network settings: pick a **public subnet**, "Auto-assign public IP" = Enable, select the security group from 3b.
- Storage: bump the root volume to **20-30 GB gp3** (default 8GB is tight once you add Docker images + Chromium + ffmpeg + video scratch space in `/tmp`).
- Advanced details → **IAM instance profile**: select the role from 3a.
- Advanced details → **User data**: paste the contents of `infra/ec2-bootstrap.sh` — this installs Docker, the Compose plugin, Nginx, and Certbot automatically on first boot, so there's no manual SSH setup step afterward. (If you'd rather run it manually after launch: `scp` it over and `sudo bash ec2-bootstrap.sh`.)
- Launch.

### 3d. Elastic IP (console: EC2 → Elastic IPs → Allocate Elastic IP address)
Allocate one, then **Actions → Associate Elastic IP address** → select the instance you just launched. This becomes your DNS target — without it, the instance's public IP changes on every stop/start.

### 3e. Verify
```bash
ssh -i your-key.pem ubuntu@<elastic-ip>
docker --version && docker compose version && nginx -v && certbot --version
```
If you used the user-data script, all four should already be installed — no `sudo apt install` needed. `docker` commands need a fresh SSH session (or `newgrp docker`) to pick up the group membership from the bootstrap script.

---

## Step 4 — Nginx reverse proxy + TLS ✅ config ready

One domain (e.g. `tributes.yourdomain.com`), Route 53 A-record → Elastic IP. Config is written at `infra/nginx.conf` — copy it to `/etc/nginx/sites-available/teachers-day`, symlink into `sites-enabled`, then run `sudo certbot --nginx -d tributes.yourdomain.com` (certbot rewrites the file to add the TLS block + http→https redirect — don't hand-write that part).

Two details that are easy to miss and would otherwise cause confusing failures, both handled in `infra/nginx.conf`:
- `client_max_body_size 200M;` — Nginx defaults to 1MB, but multer allows video uploads up to 200MB. Without this every video tribute submission gets a 413 before it even reaches the backend.
- `proxy_read_timeout`/`proxy_send_timeout`/`client_body_timeout` bumped to 300s — headroom for large video uploads on a slow connection and for uncached GIF generation.

Because everything is now same-origin, `FRONTEND_ORIGIN`/`NEXT_PUBLIC_API_URL` both simplify to relative paths (already wired up in Step 2), and `cookie-session`'s `sameSite`/`secure` config just works via the existing `trust proxy` + `X-Forwarded-Proto` handling in `backend/src/index.js` — no code changes needed there.

---

## Step 5 — Deploy & env vars

Copy `.env.example` (repo root) to `.env` on the EC2 host and fill in real values: `SESSION_SECRET` (generate a real random one), `ADMIN_PASSWORD`, `MONGODB_URI`, `MONGODB_DB_NAME`, `AWS_REGION`, `S3_BUCKET`. Leave `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` unset on EC2 — the instance role (Step 3) covers S3 auth there; those are only for local `docker compose up` testing without a role available.

Deploy flow: `git pull` → `docker compose build` → `docker compose up -d`.

---

## Step 6 — Ops basics

- **Logs:** `docker compose logs -f`, or ship to CloudWatch Logs via the `awslogs` driver.
- **Restarts:** `restart: unless-stopped` in compose handles crashes/reboots.
- **Backups:** MongoDB Atlas has automated backups already; S3 versioning can be turned on for the bucket as a safety net.
- **Updates:** no zero-downtime requirement at this scale — `docker compose up -d --build` with a few seconds of downtime is fine.

## Cost estimate (rough, monthly)

`t3.medium` ~$30, Elastic IP (free while attached), Route 53 hosted zone ~$0.50, S3 storage/requests at this volume ~$1-5, data transfer minimal. **~$35-40/mo total**, plus your existing Atlas plan.

---

## Next steps

Done: S3 bucket + IAM (Step 1), `storage.js` S3 rewrite (Step 1), both Dockerfiles + `docker-compose.yml` (Step 2), Nginx config (Step 4). Remaining: launch the EC2 instance + instance role (Step 3), point DNS at it and run certbot (Step 4), copy `.env` over and do the first `docker compose up -d` (Step 5) — all of which need AWS console/CLI access this environment doesn't have, so those are yours to run with this doc as the runbook.
