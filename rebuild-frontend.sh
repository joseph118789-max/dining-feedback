#!/bin/bash
# Rebuild frontend Docker image with cache-busting version
cd "$(dirname "$0")"
VERSION=$(date +%Y%m%d%H%M%S)
sed -i "s/?v=[^'\"]*/?v=$VERSION/" frontend/index.html 2>/dev/null
docker compose build frontend
docker compose up -d frontend
echo "Frontend rebuilt at $VERSION"
