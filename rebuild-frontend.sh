#!/bin/bash
# Rebuild script for dining-feedback frontend
# Adds cache-busting version to JS bundle

set -e

DATE=$(date +%Y%m%d%H%M)
SCRIPT="<script type=\"module\" src=\"/src/main.jsx?v=${DATE}\"></script>"

cd /root/.openclaw/workspace/projects/dining-feedback/phase2
sed -i "s|<script type=\"module\" src=\"/src/main.jsx.*</script>|<script type=\"module\" src=\"/src/main.jsx?v=${DATE}\"></script>|" index.html
echo "Set version ?v=${DATE}"

cd /root/.openclaw/workspace/projects/dining-feedback/phase4
docker compose build frontend
docker compose up -d frontend --force-recreate
echo "Frontend rebuilt with version ${DATE}"
