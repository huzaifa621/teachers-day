# EC2 Deploy Steps — follow top to bottom

Do these **in order**, on your EC2 instance, over the same SSH session you already used for Step 3e (`ssh -i your-key.pem ubuntu@<elastic-ip>`). Every gray box is something you copy-paste and run. Don't skip ahead.

---

## Step 1 — Get the code

```bash
git clone -b aws-deploy https://github.com/huzaifa621/teachers-day.git
cd teachers-day
cp .env.example .env
```

You should now be inside a `teachers-day` folder. Confirm with `pwd` — it should end in `/teachers-day`.

---

## Step 2 — Fill in your real settings

```bash
nano .env
```

This opens a text editor in your terminal. Replace the file's contents so it looks like this (keep the lines that are already correct, fill in the blanks marked below):

```
NODE_ENV=production
PORT=4173
FRONTEND_ORIGIN=http://YOUR_ELASTIC_IP
SESSION_SECRET=PASTE_RANDOM_STRING_HERE
ADMIN_PASSWORD=PICK_A_REAL_PASSWORD
MONGODB_URI=YOUR_MONGODB_ATLAS_CONNECTION_STRING
MONGODB_DB_NAME=teachers_day
AWS_REGION=ap-south-1
S3_BUCKET=teachers-day-uploads-huzaifa
```

**To get a random string for `SESSION_SECRET`:** open a *second* terminal tab/window (still SSH'd into the same instance, or just run it locally on your Mac — either works, it's just generating random text) and run:
```bash
openssl rand -hex 32
```
Copy its output and paste it in as the value of `SESSION_SECRET`.

**`YOUR_ELASTIC_IP`** — the Elastic IP address from Step 3d (the same one you used to SSH in).

**`MONGODB_URI`** — the same connection string that's in your local `backend/.env` file (`MONGODB_URI=mongodb+srv://...`) — copy it from there.

Do **not** add or uncomment `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` — leave those out entirely. The instance's IAM role handles S3 access automatically.

To save and exit nano: press `Ctrl+O`, then `Enter`, then `Ctrl+X`.

---

## Step 3 — Build and start the app

```bash
docker compose build
```
This takes a few minutes the first time (it's installing Chromium and all the Node dependencies inside the container). Wait for it to print a normal prompt back before continuing — if you see the word `error` in red, stop and copy the output to me.

```bash
docker compose up -d
docker compose ps
```
The second command should list two containers (`backend` and `frontend`), both showing `Up` in the status column.

---

## Step 4 — Set up Nginx

```bash
sudo cp infra/nginx.conf /etc/nginx/sites-available/teachers-day
sudo sed -i "s/server_name tributes.yourdomain.com;/server_name _;/" /etc/nginx/sites-available/teachers-day
sudo ln -sf /etc/nginx/sites-available/teachers-day /etc/nginx/sites-enabled/teachers-day
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```
`sudo nginx -t` should print something ending in `test is successful`. If it prints an error instead, stop and copy it to me — don't run the last line.

---

## Step 5 — Check it worked

Still in the SSH session:
```bash
curl -s http://localhost/api/health
curl -s -o /dev/null -w "frontend: %{http_code}\n" http://localhost/
```
Expected output:
- First line: `{"ok":true}`
- Second line: `frontend: 200`

If either one looks different, copy the output to me.

---

## Step 6 — Check it in your own browser

On your own computer (not the SSH session), open:
- `http://YOUR_ELASTIC_IP/` — should show the student portal
- `http://YOUR_ELASTIC_IP/masai-admin` — should show the admin login screen

**Do not try to actually log in yet.** There's no domain/HTTPS set up yet, and the app is configured to require HTTPS for login sessions to work (a security setting) — so pages will load, but logging in won't "stick" until we add a domain and TLS certificate in the next step. That's expected, not a bug.

---

## When you're done

Report back what happened at Step 3 (`docker compose ps` output), Step 5 (the two curl results), and Step 6 (did both pages load in your browser). I'll take it from there.
