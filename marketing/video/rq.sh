#!/bin/bash
cd "$(dirname "$0")"
for id in "$@"; do
  python3 vo.py episodes/$id > episodes/$id.render.log 2>&1 && python3 mkedit.py episodes/$id >> episodes/$id.render.log 2>&1 && python3 -I compose2.py episodes/$id >> episodes/$id.render.log 2>&1 && ./sheet.sh episodes/$id >> episodes/$id.render.log 2>&1
  echo "$id render: $(tail -n 1 episodes/$id.render.log | cut -c1-100)"
done
