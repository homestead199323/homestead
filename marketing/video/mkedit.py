"""Build edit.json from spec.json so every voiced clip is long enough for its line.
Usage: python3 mkedit.py <episode_dir>   (needs frames/events.json, durs.json, spec.json)
Speed per voiced clip = source length / (voice length + delay + slack), clamped to [smin, smax];
if even smin is too fast to fit... the clip is frozen on its last frame for the missing seconds."""
import json, sys
D = sys.argv[1].rstrip('/')
EV = json.load(open(f'{D}/frames/events.json')); M = EV['marks']; FPS = EV['fps']
DURS = json.load(open(f'{D}/durs.json')); S = json.load(open(f'{D}/spec.json'))
def fr(x):
    if isinstance(x, (int, float)): return int(x)
    if '-' in x:
        n, _, o = x.partition('-'); return M[n] - int(round(float(o) * FPS))
    n, _, o = x.partition('+'); return M[n] + (int(round(float(o) * FPS)) if o else 0)
clips = []
for c in S['clips']:
    a, b = fr(c['from']), fr(c['to']); n = abs(b - a)
    o = {'from': c['from'], 'to': c['to']}
    if c.get('reverse'): o['reverse'] = True
    if 'vo' in c:
        delay = c.get('vo_delay', 0.0); need = DURS[c['vo']] + delay + 0.18
        smin, smax = c.get('smin', 0.8), c.get('smax', 2.2)
        sp = n / (need * FPS); sp = max(smin, min(smax, sp))
        out_len = n / sp / FPS
        o['speed'] = round(sp, 3); o['vo'] = c['vo']
        if delay: o['vo_delay'] = delay
        if out_len < need - 0.02: o['freeze'] = round(need - out_len, 2)
    else:
        o['speed'] = c.get('speed', 1.0)
    for k in ('sfx', 'sfx_at'):
        if k in c: o[k] = c[k]
    clips.append(o)
E = {'punch': S.get('punch', 0), 'cap_y': S.get('cap_y', 1330), 'hook': S['hook'], 'endcard': S['endcard'], 'clips': clips, 'layout': 'frame', 'xfade': S.get('xfade', 6)}
json.dump(E, open(f'{D}/edit.json', 'w'), indent=1)
tot = 0
for c in clips:
    a, b = fr(c['from']), fr(c['to']); L = abs(b - a) / c['speed'] / FPS + c.get('freeze', 0); tot += L
print('clips', len(clips), 'est total', round(tot + S['endcard'].get('secs', 2.5), 1), 's')
