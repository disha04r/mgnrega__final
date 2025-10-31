#!/bin/bash
# Minimal deploy helper for Ubuntu 22.04 (DigitalOcean)
set -e
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx git build-essential
sudo npm install -g pm2
echo "Copy project to /var/www/mgnrega, then run:"
echo "cd /var/www/mgnrega/backend && npm install && pm2 start server.js --name mgnrega-backend"
echo "Configure nginx with deploy/nginx.conf and reload nginx."
