# Deployment.md — Deploying to AWS (Step by Step)

This guide walks you through deploying the Teachers' Day Postcard Portal to AWS from
scratch: one EC2 instance running the frontend + backend in Docker, behind Nginx with
HTTPS, using S3 for file storage and MongoDB Atlas for the database.

You don't need any AWS experience — just follow the steps in order. Each step tells you
exactly what to click or type.

**Architecture:**

```
Internet → Route 53 (DNS) → EC2 (Elastic IP)
                              └─ Nginx :80/:443 (TLS via Let's Encrypt)
                                   ├─ /api/*  → backend container  (Node/Express, :4173)
                                   └─ /*      → frontend container (Next.js,    :3001)
Backend  → MongoDB Atlas (database)
Backend  → S3 bucket (generated files, reading videos back for compositing)
Browser  → S3 bucket (direct presigned PUT for video/photo uploads)
```

Uploads don't pass through the server: the backend signs a short-lived S3 URL and
the browser PUTs the file straight to the bucket, then posts only the resulting
key back. That keeps 200MB videos off the app server's RAM and bandwidth.

---

## Before you start

You'll need:
- An AWS account (https://aws.amazon.com/ — sign up if you don't have one)
- A MongoDB Atlas connection string (existing or create a free cluster at https://www.mongodb.com/cloud/atlas)
- A domain name you can point at your server (optional but recommended for HTTPS)
- The AWS CLI installed locally (`brew install awscli` on Mac), for a couple of one-time setup commands

---

## Step 1 — Create an S3 bucket (file storage)

Bucket names must be globally unique, so pick something specific like `teachers-day-uploads-yourname`.

**Console:**
1. Go to **S3** → **Create bucket**.
2. Enter your bucket name, pick a region close to your users (e.g. `ap-south-1` for India).
3. Under **Block Public Access settings**, uncheck **"Block all public access"** and confirm the warning (we grant access via a bucket policy instead).
4. Click **Create bucket**.
5. Open the new bucket → **Permissions** tab → **Bucket policy** → paste in the contents of `infra/s3-bucket-policy.json` from this repo, replacing `REPLACE_BUCKET_NAME` with your real bucket name.
6. Same **Permissions** tab → **Cross-origin resource sharing (CORS)** → **Edit** → paste in the contents of `infra/s3-cors.json`, replacing `REPLACE_YOUR_DOMAIN` with your real domain (e.g. `tributes.yourdomain.com`).

   This step is **required**: the browser uploads videos and faculty photos straight to S3 (the app server only signs the request), and without a CORS rule the browser blocks those uploads. Keep the `http://localhost:3001` entry if you develop locally; drop it if you don't.

**Or via CLI** (once `aws configure` is set up with your credentials):
```bash
BUCKET=your-bucket-name
REGION=ap-south-1

aws s3api create-bucket --bucket "$BUCKET" --region "$REGION" \
  --create-bucket-configuration LocationConstraint="$REGION"

aws s3api put-public-access-block --bucket "$BUCKET" --public-access-block-configuration \
  BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false

sed "s/REPLACE_BUCKET_NAME/$BUCKET/" infra/s3-bucket-policy.json > /tmp/bucket-policy.json
aws s3api put-bucket-policy --bucket "$BUCKET" --policy file:///tmp/bucket-policy.json

sed "s/REPLACE_YOUR_DOMAIN/tributes.yourdomain.com/" infra/s3-cors.json > /tmp/cors-rules.json
aws s3api put-bucket-cors --bucket "$BUCKET" \
  --cors-configuration "{\"CORSRules\": $(cat /tmp/cors-rules.json)}"

# verify the CORS rule landed
aws s3api get-bucket-cors --bucket "$BUCKET"
```

Keep your bucket name and region handy — you'll need them in Step 5.

---

## Step 2 — Create an IAM role for the server

This lets your EC2 instance talk to S3 without needing to store any secret keys on it.

1. Go to **IAM** → **Roles** → **Create role**.
2. Trusted entity type: **AWS service** → Use case: **EC2** → **Next**.
3. Create a policy (or attach an existing one) using `infra/s3-app-iam-policy.json` from this repo — swap in your real bucket name where it says `REPLACE_BUCKET_NAME`. This scopes access to only `GetObject`/`PutObject`/`DeleteObject` on your one bucket.
4. Name the role something like `teachers-day-ec2-role` → **Create role**.

---

## Step 3 — Create a security group (firewall rules)

1. Go to **EC2** → **Security Groups** → **Create security group**.
2. Add these **inbound** rules only (leave outbound as default — allow all):

| Type | Port | Source |
|---|---|---|
| SSH | 22 | My IP |
| HTTP | 80 | Anywhere (0.0.0.0/0) |
| HTTPS | 443 | Anywhere (0.0.0.0/0) |

Nothing else needs to be open — the app's internal ports (3001, 4173) are never exposed to the internet.

---

## Step 4 — Launch the EC2 instance

1. Go to **EC2** → **Launch instance**.
2. **Name:** anything, e.g. `teachers-day-server`.
3. **AMI:** Ubuntu Server 22.04 LTS.
4. **Instance type:** `t3.medium` (2 vCPU / 4GB RAM — needed for Chromium + ffmpeg + Node running together).
5. **Key pair:** create a new one and download the `.pem` file — you'll need it to log in.
6. **Network settings:** enable **Auto-assign public IP**, and select the security group from Step 3.
7. **Storage:** increase the root volume to **20–30 GB** (default 8GB is too small).
8. Expand **Advanced details**:
   - **IAM instance profile:** select the role from Step 2.
   - **User data:** paste in the full contents of `infra/ec2-bootstrap.sh` — this automatically installs Docker, Docker Compose, Nginx, and Certbot on first boot.
9. Click **Launch instance**.

### Give it a fixed IP address

1. Go to **EC2** → **Elastic IPs** → **Allocate Elastic IP address**.
2. Select it → **Actions** → **Associate Elastic IP address** → choose your new instance.

This IP won't change even if the server restarts — this is what you'll point your domain at.

### Verify it's ready

Wait a minute or two after launch for the bootstrap script to finish, then:
```bash
ssh -i your-key.pem ubuntu@<your-elastic-ip>
docker --version && docker compose version && nginx -v && certbot --version
```
All four should print version numbers. If `docker` isn't recognized, wait a bit longer and reconnect (the bootstrap script runs in the background on first boot).

---

## Step 5 — Deploy the app

Still in that SSH session:

```bash
git clone -b aws-deploy https://github.com/YOUR_USERNAME/teachers-day.git
cd teachers-day
cp .env.example .env
nano .env
```

Fill in the `.env` file:
```
NODE_ENV=production
PORT=4173
FRONTEND_ORIGIN=http://YOUR_ELASTIC_IP
SESSION_SECRET=PASTE_RANDOM_STRING_HERE
ADMIN_PASSWORD=PICK_A_REAL_PASSWORD
MONGODB_URI=YOUR_MONGODB_ATLAS_CONNECTION_STRING
MONGODB_DB_NAME=teachers_day
AWS_REGION=ap-south-1
S3_BUCKET=your-bucket-name
```

- For `SESSION_SECRET`, generate a random value: `openssl rand -hex 32`
- Leave `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` **out entirely** — the IAM role from Step 2 handles S3 access automatically.
- Save and exit nano: `Ctrl+O`, `Enter`, `Ctrl+X`.

Now build and start the containers:
```bash
docker compose build
docker compose up -d
docker compose ps
```
You should see both `backend` and `frontend` containers listed as `Up`.

---

## Step 6 — Set up Nginx (reverse proxy)

```bash
sudo cp infra/nginx.conf /etc/nginx/sites-available/teachers-day
sudo sed -i "s/server_name tributes.yourdomain.com;/server_name _;/" /etc/nginx/sites-available/teachers-day
sudo ln -sf /etc/nginx/sites-available/teachers-day /etc/nginx/sites-enabled/teachers-day
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```
`sudo nginx -t` should end with `test is successful`. If not, stop and fix the error before reloading.

### Check it's working

```bash
curl -s http://localhost/api/health
curl -s -o /dev/null -w "frontend: %{http_code}\n" http://localhost/
```
Expected: `{"ok":true}` and `frontend: 200`.

Then from your own browser, visit `http://YOUR_ELASTIC_IP/` — you should see the app.

---

## Step 7 — Point your domain at it + enable HTTPS (optional but recommended)

1. In **Route 53** (or your domain registrar), create an **A record** for your domain (e.g. `tributes.yourdomain.com`) pointing to your Elastic IP.
2. Wait for DNS to propagate (a few minutes to an hour).
3. Back on the server:
```bash
sudo sed -i "s/server_name _;/server_name tributes.yourdomain.com;/" /etc/nginx/sites-available/teachers-day
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d tributes.yourdomain.com
```
Certbot will automatically request a free TLS certificate and rewrite the Nginx config to serve HTTPS and redirect HTTP → HTTPS.

4. Visit `https://tributes.yourdomain.com` — you should see the padlock and a working app.

Note: logging into the admin panel requires HTTPS to work correctly (secure cookies), so do this step before testing login.

---

## Everyday operations

- **View logs:** `docker compose logs -f`
- **Restart after a crash/reboot:** happens automatically (`restart: unless-stopped`)
- **Deploy new changes:**
  ```bash
  git pull
  docker compose up -d --build
  ```

- **One-off: the professors -> faculty migration.** Needed once, when deploying the
  release that renamed professors to faculty, made a faculty member's institute a
  list, dropped designation, and made email a unique identifier. Run it *before*
  starting the new containers — the app creates a unique index on `email` at boot
  and will crash if any record has a blank or duplicated address.
  ```bash
  git pull
  docker compose build backend        # the script ships inside the image
  docker compose run --rm backend node scripts/migrate-faculty.js          # report only
  docker compose run --rm backend node scripts/migrate-faculty.js --apply  # migrate
  docker compose up -d --build        # only now start the new containers
  ```
  The `build` step is not optional: `docker compose run` uses the existing image,
  so without it you get `Cannot find module '/app/scripts/migrate-faculty.js'`.

  The report run changes nothing. If it lists blank or duplicated emails, fix those
  first — only a human can decide the right address. Re-running after a successful
  migration is a no-op.
- **Backups:** MongoDB Atlas backs up automatically. Consider enabling S3 bucket versioning as a safety net.

---

## Rough monthly cost

| Item | Cost |
|---|---|
| EC2 `t3.medium` | ~$30 |
| Elastic IP (attached) | Free |
| Route 53 hosted zone | ~$0.50 |
| S3 storage/requests | ~$1–5 |
| **Total** | **~$35–40/mo** (plus your Atlas plan) |
