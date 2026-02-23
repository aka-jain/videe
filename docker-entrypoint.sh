#!/bin/sh
set -e

echo "== container uid/gid ==" && id
echo "== mounts ==" && mount | grep /app || true
echo "== dirs ==" && ls -ld /app /app/storage || true
echo "== pre-mkdir test ==" && mkdir -p /app/storage/_probe 2>&1 || true

exec node dist/index.js
