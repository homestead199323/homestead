// Balcony (b1-b5) and garden (g1-g5) series. Usage: node scenes_bg.js b1
const Rec = require('./rec'); const onboard2 = require('./onboard2'); const fs = require('fs');
const id = process.argv[2]; const env = id[0] === 'b' ? 'balcony' : 'garden'; const n = +id[1];
const out = `episodes/${id}/frames`;
const SC = {
  1: async (r) => { await onboard2(r, env, { rec: ['space', 'dims', 'sun', 'exp', 'time'], to: 'time' }); r.recording = true; r.mark('end'); await r.hold(0.5); },
  2: async (r) => { await onboard2(r, env, { rec: ['crops', 'map'], to: 'map' }); r.recording = true; r.mark('end'); await r.hold(0.6); },
  3: async (r) => {
    const p = r.p; await onboard2(r, env, { rec: ['plan', 'home'], to: 'home' }); r.recording = true;
    await r.scroll(330, 1.0); r.mark('kit'); await r.hold(0.8);
    const items = p.locator('section[aria-label="Starter kit"] label'); const cnt = await items.count();
    for (let i = 0; i < cnt; i++) { await r.tap(items.nth(i), { pre: 0.25, post: 0.45 }); }
    r.mark('kit_done'); await r.hold(1.2);
    r.mark('end'); await r.hold(0.3);
  },
  4: async (r) => {
    const p = r.p; await settle(r);
    r.recording = true; r.mark('home'); await r.hold(1.0); await r.scroll(500, 0.9); r.mark('jobs'); await r.hold(0.6);
    await r.tap(p.getByRole('button', { name: /: Sow/ }).first()); r.mark('plan'); await r.hold(1.0);
    for (let i = 1; i <= 3; i++) { r.mark('s' + i); await r.tap(p.getByRole('button', { name: 'I sowed it' }).first()); await r.hold(0.6); }
    r.mark('bars'); await r.hold(0.8); await r.scroll(360, 1.1); r.mark('bars2'); await r.hold(1.6);
    await r.tap(p.getByRole('tab', { name: 'Calendar' }).or(p.getByRole('button', { name: 'Calendar', exact: true })).first()); r.mark('cal'); await r.hold(1.2); await r.scroll(300, 1.0); r.mark('cal2'); await r.hold(1.2);
    r.mark('end'); await r.hold(0.3);
  },
  5: async (r) => {
    const p = r.p; await settle(r);
    await r.scroll(500, 0.5); await r.skip(0.3);
    await r.tap(p.getByRole('button', { name: /: Sow/ }).first()); await r.skip(0.6);
    for (let i = 0; i < 3; i++) { await r.tap(p.getByRole('button', { name: 'I sowed it' }).first()); await r.skip(0.5); }
    await r.tap(p.getByRole('button', { name: /^Today/ }).last()); await r.skip(0.8);
    r.recording = true; r.mark('home'); await r.hold(0.8);
    await r.tap('Open the farm map'); r.recording = false;
    await r.skip(1.5); await p.waitForTimeout(2500); await r.skip(0.5);
    r.recording = true; r.mark('map'); await r.hold(1.2);
    await r.tap('Growth preview and legend'); r.mark('grow0'); await r.hold(0.7);
    await r.tap('+2 wk'); await r.hold(0.7); await r.tap('+1 mo'); r.mark('g1'); await r.hold(0.8);
    await r.tap('+2 mo'); r.mark('g2'); await r.hold(0.9);
    await r.tap('Zoom in'); await r.hold(0.3); await r.tap('Zoom in'); r.mark('zoomed'); await r.hold(1.5);
    await r.tap('+3 mo'); r.mark('g3'); await r.hold(1.6);
    r.mark('end'); await r.hold(0.3);
  },
};
// garden / balcony 5 differ: garden 5 = morning walk (2D, fast)
const GWALK = async (r) => {
  const p = r.p; await settle(r);
  r.recording = true; r.mark('home'); await r.hold(1.0);
  await r.tap('Start morning walk'); await r.hold(0.4);
  await r.tap('Begin my walk'); r.mark('walk'); await r.hold(0.8);
  const nxt = () => p.locator('[role=dialog] button', { hasText: /next|Done 1 job/ }).last();
  for (let i = 0; i < 3; i++) { r.mark('s' + (i + 1)); await r.hold(0.7); await r.tap('Done'); await r.hold(0.5); await r.tap(nxt()); await r.hold(0.3); }
  r.mark('walk_end'); await r.hold(0.8);
  await r.tap('Back to my farm'); await r.hold(0.8);
  r.mark('end'); await r.hold(0.3);
};
async function settle(r) { await r.skip(2.0); await r.p.waitForTimeout(2500); await r.skip(0.5); }
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const kv = n >= 4 ? JSON.parse(fs.readFileSync(`episodes/state_${env}.json`)) : null;
  const r = await Rec.open({ out, storage: kv }); const t0 = Date.now();
  const fn = (id === 'g5') ? GWALK : SC[n];
  await fn(r);
  console.log(id, 'frames', r.n, Math.round((Date.now() - t0) / 1000) + 's');
  await r.save();
})().catch(e => { console.error('FAIL', id, e.message.slice(0, 300)); process.exit(1); });
