#!/bin/bash
# Installs Docker + Compose plugin, Nginx, and Certbot on a fresh Ubuntu 22.04
# EC2 instance. Paste this into the launch wizard's "Advanced details > User
# data" field (runs once, automatically, at first boot as root) — or SSH in
# after launch and run it manually with `sudo bash ec2-bootstrap.sh`.
set -euxo pipefail

apt-get update
apt-get install -y ca-certificates curl gnupg nginx

# Docker's official apt repo (the Ubuntu-bundled docker.io package is older/unmaintained)
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Lets the default `ubuntu` user run `docker`/`docker compose` without sudo
# (takes effect on next SSH login).
usermod -aG docker ubuntu

# Certbot via snap — the officially recommended install method (the apt
# package is frequently outdated).
snap install core
snap refresh core
snap install --classic certbot
ln -sf /snap/bin/certbot /usr/bin/certbot

systemctl enable --now docker
systemctl enable --now nginx
