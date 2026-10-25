"""Append a separately recorded clip (e.g. episodes/ep1/orbit) to the main frames.
Usage: python3 merge_orbit.py episodes/ep1 orbit
Adds marks '<name>2' and '<name>2_end' (from the clip's 'orbit'/'orbit_end' marks)."""
import json, shutil, sys
D, sub = sys.argv[1].rstrip('/'), sys.argv[2]
ev = json.load(open(f'{D}/frames/events.json')); ob = json.load(open(f'{D}/{sub}/events.json'))
off = ev['frames']
for i in range(ob['frames']):
    shutil.copy(f'{D}/{sub}/{i:05d}.jpg', f'{D}/frames/{off + i:05d}.jpg')
for e in ob['events']:
    e = dict(e)
    for k in ('f', 'f0', 'f1'):
        if k in e: e[k] += off
    ev['events'].append(e)
ev['marks']['orbit2'] = off + ob['marks']['orbit']; ev['marks']['orbit2_end'] = off + ob['marks']['orbit_end']
ev['frames'] = off + ob['frames']
json.dump(ev, open(f'{D}/frames/events.json', 'w'), indent=1); print(ev['marks'])
