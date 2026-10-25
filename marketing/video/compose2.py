"""Edit a frame-stepped MyTerra recording into a 9:16 short.
Usage: python3 -I compose2.py <episode_dir>
<episode_dir> holds: frames/ (00000.jpg… + events.json), lines.json, durs.json,
vo_<key>.wav and edit.json (clips, hook, endcard). Writes <episode_dir>/final.mp4.
"""
import json, math, os, subprocess, sys
import numpy as np, soundfile as sf
from PIL import Image, ImageDraw, ImageFont

D = sys.argv[1].rstrip('/')
EV = json.load(open(f'{D}/frames/events.json'))
ED = json.load(open(f'{D}/edit.json'))
LINES = dict(json.load(open(f'{D}/lines.json')))
DURS = json.load(open(f'{D}/durs.json'))
FPS = EV['fps']; W, H = 1080, 1920; SR = 44100
SC = W / 390  # css px → output px
M = EV['marks']
FONT = '/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf'
F_CAP = ImageFont.truetype(FONT, 74)
F_HOOK = ImageFont.truetype(FONT, 66)
F_PILL = ImageFont.truetype(FONT, 40)
F_END = ImageFont.truetype(FONT, 88)
HILITE = (255, 214, 10)

def fr(x):
    if isinstance(x, (int, float)): return int(x)
    if '-' in x:
        name, _, off = x.partition('-'); return M[name] - int(round(float(off) * FPS))
    name, _, off = x.partition('+')
    return M[name] + (int(round(float(off) * FPS)) if off else 0)

# ---- timeline: list of output frames → source frame index ----------------
src = []          # source frame per output frame
clip_at = []      # (output_start_frame, clip)
for c in ED['clips']:
    a, b, sp = fr(c['from']), fr(c['to']), c.get('speed', 1.0)
    clip_at.append((len(src), c))
    if c.get('reverse'):
        n = int((a - b) / sp)
        src += [max(b, a - 1 - int(round(i * sp))) for i in range(n)]
    else:
        n = int((b - a) / sp)
        src += [min(b - 1, a + int(round(i * sp))) for i in range(n)]
    if c.get('freeze'):
        src += [src[-1]] * int(c['freeze'] * FPS)
N = len(src); TOTAL = N / FPS
tap_out = []
for (o0, c) in clip_at:
    a_, b_, sp_ = fr(c['from']), fr(c['to']), c.get('speed', 1.0)
    for e in [e for e in EV['events'] if e['type'] == 'tap']:
        if not c.get('reverse') and a_ <= e['f'] < b_:
            tap_out.append((o0 + (e['f'] - a_) / sp_) / FPS)
print(f'{N} frames, {TOTAL:.2f}s')

# ---- voice schedule ------------------------------------------------------
vo_sched = []; last_end = 0.0
for (o0, c) in clip_at:
    if 'vo' not in c: continue
    st = max(o0 / FPS + c.get('vo_delay', 0.0), last_end + 0.12)
    vo_sched.append((st, c['vo'])); last_end = st + DURS[c['vo']]
assert last_end <= TOTAL + 0.3, f'voice runs past the end: {last_end:.2f} > {TOTAL:.2f}'

# word-level caption timing (proportional to characters, no forced alignment)
cap_words = []  # (t0, t1, group_id, word_index, word)
gid = 0
for st, key in vo_sched:
    words = LINES[key].split(); dur = DURS[key] * 0.96
    weights = [len(w) + 1.5 for w in words]; tot = sum(weights); t = st
    groups = []; cur = []
    for w in words:
        cur.append(w)
        if len(cur) == 3 or w.endswith(('.', ',', '?', '!')): groups.append(cur); cur = []
    if cur: groups.append(cur)
    for g in groups:
        for k, w in enumerate(g):
            d = dur * (len(w) + 1.5) / tot
            cap_words.append((t, t + d, gid, k, w)); t += d
        gid += 1
groups = {}
for (t0, t1, g, k, w) in cap_words: groups.setdefault(g, []).append((t0, t1, k, w))

# ---- events mapped to output frames --------------------------------------
taps = [e for e in EV['events'] if e['type'] == 'tap']
paths = [e for e in EV['events'] if e['type'] in ('drag', 'swipe')]
inv = {}
for o, s in enumerate(src): inv.setdefault(s, o)

def ease(x): return 0.5 - 0.5 * math.cos(math.pi * max(0.0, min(1.0, x)))

cache = {}
def load(i):
    if i not in cache:
        if len(cache) > 6: cache.pop(next(iter(cache)))
        cache[i] = Image.open(f'{D}/frames/{i:05d}.jpg').convert('RGB').resize((W, H), Image.LANCZOS)
    return cache[i]

def text_w(d, s, f): return d.textlength(s, font=f)

def draw_box(d, lines, f, cy, fill, fg, pad=26, r=28):
    lh = f.size * 1.2; bw = max(text_w(d, l, f) for l in lines) + pad * 2.2; bh = lh * len(lines) + pad * 1.6
    x0 = (W - bw) / 2; y0 = cy - bh / 2
    d.rounded_rectangle([x0, y0, x0 + bw, y0 + bh], radius=r, fill=fill)
    for i, l in enumerate(lines):
        d.text(((W - text_w(d, l, f)) / 2, y0 + pad * 0.8 + i * lh), l, font=f, fill=fg)

def wrap(d, s, f, maxw):
    out = []; cur = ''
    for w in s.split():
        t = (cur + ' ' + w).strip()
        if text_w(d, t, f) <= maxw: cur = t
        else: out.append(cur); cur = w
    return out + [cur]

enc = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}',
                        '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '19',
                        '-pix_fmt', 'yuv420p', f'{D}/video.mp4'], stdin=subprocess.PIPE)
for o in range(N):
    s = src[o]; t = o / FPS
    im = load(s)
    # punch-in zoom around taps happening near this source frame
    z, cx, cy = 1.0, W / 2, H / 2
    for e in taps:
        dfr = s - e['f']
        if -8 <= dfr <= 14:
            k = math.exp(-((dfr - 2) / 7.0) ** 2) * ED.get('punch', 0.045)
            if k > z - 1: z, cx, cy = 1 + k, e['x'] * SC, e['y'] * SC
    if z > 1.001:
        cw, ch = W / z, H / z
        x0 = min(max(cx - cw / 2, 0), W - cw); y0 = min(max(cy - ch / 2, 0), H - ch)
        im = im.resize((W, H), Image.BILINEAR, box=(x0, y0, x0 + cw, y0 + ch))
        mapx = lambda x: (x * SC - x0) * z; mapy = lambda y: (y * SC - y0) * z
    else:
        im = im.copy(); mapx = lambda x: x * SC; mapy = lambda y: y * SC
    d = ImageDraw.Draw(im, 'RGBA')
    # finger: taps
    for e in taps:
        dfr = s - e['f']
        if -7 <= dfr <= 10:
            px, py = mapx(e['x']), mapy(e['y'])
            if dfr < 0:
                rr = 30 + (-dfr) * 2.2; a = int(200 * (1 + dfr / 7.5))
                d.ellipse([px - rr, py - rr, px + rr, py + rr], fill=(255, 255, 255, a // 2), outline=(40, 40, 40, a // 3), width=3)
            else:
                rr = 30 + dfr * 7; a = int(230 * (1 - dfr / 10.5))
                d.ellipse([px - 28, py - 28, px + 28, py + 28], fill=(255, 255, 255, max(0, a - 60)))
                d.ellipse([px - rr, py - rr, px + rr, py + rr], outline=(255, 255, 255, a), width=6)
    # finger: drags / swipes
    for e in paths:
        if e['f0'] - 4 <= s <= e['f1'] + 4:
            u = ease((s - e['f0']) / max(1, e['f1'] - e['f0']))
            px, py = mapx(e['x0'] + (e['x1'] - e['x0']) * u), mapy(e['y0'] + (e['y1'] - e['y0']) * u)
            d.ellipse([px - 30, py - 30, px + 30, py + 30], fill=(255, 255, 255, 150), outline=(40, 40, 40, 80), width=3)
    # hook (first frames)
    hk = ED.get('hook')
    if hk and t < hk['until']:
        if hk.get('pill'):
            pw = text_w(d, hk['pill'], F_PILL) + 48
            d.rounded_rectangle([(W - pw) / 2, 200, (W + pw) / 2, 262], radius=31, fill=(31, 92, 60, 235))
            d.text(((W - text_w(d, hk['pill'], F_PILL)) / 2, 208), hk['pill'], font=F_PILL, fill=(255, 255, 255))
        draw_box(d, wrap(d, hk['text'], F_HOOK, 880), F_HOOK, 380, (255, 255, 255, 245), (17, 24, 20))
    # end card
    ec = ED.get('endcard')
    if ec and t >= TOTAL - ec['secs']:
        # fade in, then out over the last 0.35 s so the final frame matches frame 1 (seamless loop)
        k = min(1.0, (t - (TOTAL - ec['secs'])) / 0.35, max(0.0, (TOTAL - 0.05 - t) / 0.35))
        d.rectangle([0, 0, W, H], fill=(10, 20, 14, int(120 * k)))
        for i, l in enumerate(ec['lines']):
            f = F_END if i == 0 else F_CAP
            if k > 0.02:
                d.text(((W - text_w(d, l, f)) / 2, 330 + i * 120), l, font=f, fill=(255, 255, 255, int(255 * k)), stroke_width=7, stroke_fill=(17, 24, 20, int(255 * k)))
    # captions: active 3-word group, current word highlighted
    act = next((g for g, ws in groups.items() if ws[0][0] <= t < ws[-1][1] + 0.12), None)
    if act is not None:
        ws = groups[act]; line = [w for (_, _, _, w) in ws]
        widths = [text_w(d, w.upper(), F_CAP) for w in line]; sp = 22
        tot = sum(widths) + sp * (len(line) - 1); scale = min(1.0, 940 / tot)
        f = F_CAP if scale == 1.0 else ImageFont.truetype(FONT, int(74 * scale))
        widths = [text_w(d, w.upper(), f) for w in line]; tot = sum(widths) + sp * (len(line) - 1)
        x = (W - tot) / 2; y = ED.get('cap_y', 1330)
        for (t0, t1, k, w), ww in zip(ws, widths):
            col = HILITE if t0 <= t < t1 + 0.05 else (255, 255, 255)
            d.text((x, y), w.upper(), font=f, fill=col, stroke_width=7, stroke_fill=(17, 24, 20))
            x += ww + sp
    enc.stdin.write(im.tobytes())
enc.stdin.close(); enc.wait()

# ---- audio ---------------------------------------------------------------
NS = int((TOTAL + 0.3) * SR); mix = np.zeros((NS, 2))
mus, _ = sf.read(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'music.wav')); L = min(NS, len(mus))
duck = np.ones(NS)
for st, key in vo_sched:
    i0, i1 = int(st * SR), int((st + DURS[key]) * SR); duck[max(0, i0 - 2000):min(NS, i1 + 4000)] = 0.55
duck = np.convolve(duck, np.ones(2205) / 2205, mode='same')
mix[:L] += mus[:L] * (0.20 * duck[:L])[:, None]
tap, _ = sf.read(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tap.wav'))
for t in tap_out:
    i = int(t * SR); seg = tap[:max(0, NS - i)]; mix[i:i + len(seg)] += np.c_[seg, seg] * 0.45
HERE_ = os.path.dirname(os.path.abspath(__file__))
for (o0, c) in clip_at:
    if c.get('sfx'):
        fx, fsr = sf.read(os.path.join(HERE_, c['sfx'] + '.wav'))
        if fx.ndim > 1: fx = fx[:, 0]
        i = max(0, int((o0 / FPS + c.get('sfx_at', 0)) * SR)); seg = fx[:max(0, NS - i)]
        mix[i:i + len(seg)] += np.c_[seg, seg] * 0.5
for st, key in vo_sched:
    v, vsr = sf.read(f'{D}/vo_{key}.wav')
    if vsr != SR: v = np.interp(np.arange(0, len(v), vsr / SR), np.arange(len(v)), v)
    i = int(st * SR); seg = v[:max(0, NS - i)]; mix[i:i + len(seg)] += np.c_[seg, seg] * 0.95
mix /= max(1.0, np.abs(mix).max() / 0.95)
sf.write(f'{D}/audio.wav', mix, SR)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', f'{D}/video.mp4', '-i', f'{D}/audio.wav', '-c:v', 'copy',
                '-af', 'loudnorm=I=-14:TP=-1.5:LRA=9', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-shortest', f'{D}/final.mp4'], check=True)
print('wrote', f'{D}/final.mp4', 'taps with sound:', len(tap_out))
