"""Merge two recordings of one episode: frames [0, cut) of A, then all of B (marks/events offset).
Usage: python3 merge_parts.py <A_frames> <B_frames> <out_frames> <cut_mark_in_A>"""
import json, os, shutil, sys
A, B, O, cut = sys.argv[1:5]
ea = json.load(open(f'{A}/events.json')); eb = json.load(open(f'{B}/events.json'))
n = ea['marks'][cut]; os.makedirs(O, exist_ok=True)
for i in range(n): shutil.copy(f'{A}/{i:05d}.jpg', f'{O}/{i:05d}.jpg')
for i in range(eb['frames']): shutil.copy(f'{B}/{i:05d}.jpg', f'{O}/{n + i:05d}.jpg')
def sh(e):
    e = dict(e)
    for k in ('f', 'f0', 'f1'):
        if k in e: e[k] += n
    return e
marks = {k: v for k, v in ea['marks'].items() if v <= n}
marks.update({k: v + n for k, v in eb['marks'].items() if k not in marks})
ev = [e for e in ea['events'] if e.get('f', e.get('f0')) < n] + [sh(e) for e in eb['events']]
json.dump({'fps': ea['fps'], 'frames': n + eb['frames'], 'events': ev, 'marks': marks}, open(f'{O}/events.json', 'w'), indent=1)
print('merged', n + eb['frames'], 'frames', marks)
