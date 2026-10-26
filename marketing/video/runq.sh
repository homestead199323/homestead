#!/bin/bash
# usage: runq.sh id id id ... ; records each scene, retries once on failure
cd "$(dirname "$0")"
for id in "$@"; do
  for try in 1 2; do
    curl -s -o /dev/null --max-time 5 http://127.0.0.1:5179/app.html || (cd ../.. && (setsid nohup npx vite --port 5179 --host 127.0.0.1 > /tmp/vite.log 2>&1 &) ; sleep 6)
    rm -rf episodes/$id/frames; node scenes_bg.js $id > episodes/$id.log 2>&1 && break
  done
  tail -1 episodes/$id.log
done
