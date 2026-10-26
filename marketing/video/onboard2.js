// Staged onboarding for the balcony / garden series. Each stage records only if its name is in `rec`.
const CFG = {
  balcony: { label: 'Balcony', dims: ['4', '1.5'], covered: 'Partly covered', sun: '3–5h', dir: 'Afternoon', own: ['Pots & containers', 'Basic tools'], picks: ['Lettuce', 'Mint', 'Swiss Chard'] },
  garden:  { label: 'Backyard', dims: ['10', '8'], covered: null, sun: '5–7h', dir: 'All day', own: ['Raised bed', 'Compost bin', 'Basic tools'], picks: ['Lettuce', 'Radish', 'Kale'] },
};
module.exports = async function onboard2(r, env, { rec = [], from = 'space', to = 'home' } = {}) {
  const c = CFG[env], p = r.p;
  const ins = () => p.locator('[role=dialog] input:not([type=checkbox]):not([type=radio])');
  const order = ['space', 'dims', 'region', 'sun', 'goal', 'exp', 'time', 'house', 'own', 'crops', 'map', 'plan', 'home'];
  const steps = {
    space: async () => { await r.tap('Get started'); await r.hold(0.3); r.mark('space_in'); await r.hold(0.5); await r.tap(c.label); await r.tap('Continue'); },
    dims: async () => { r.mark('dims_in'); await r.hold(0.4); await r.type(ins().nth(0), c.dims[0]); await r.type(ins().nth(1), c.dims[1]); await r.hold(0.4); if (c.covered) { r.mark('dims_cov'); await r.tap(c.covered); } await r.hold(0.5); r.mark('dims_done'); await r.tap('Continue'); },
    region: async () => { await r.tap('Western Europe'); await r.tap('Continue'); },
    sun: async () => { r.mark('sun_in'); await r.hold(0.5); await r.tap(c.sun); await r.tap(c.dir); await r.hold(0.3); await r.tap('Continue'); },
    goal: async () => { await r.tap('Fresh food'); await r.tap('Continue'); },
    exp: async () => { r.mark('exp_in'); await r.hold(0.4); await r.tap('Total beginner'); await r.tap('Continue'); },
    time: async () => { r.mark('time_in'); await r.hold(0.5); await r.tap('15 min a day'); await r.hold(0.3); r.mark('time_done'); await r.tap('Continue'); },
    house: async () => { await r.tap('2'); await r.tap('Cook it fresh'); await r.tap('Continue'); },
    own: async () => { for (const o of c.own) await r.tap(o); await r.hold(0.2); await r.tap('Continue'); },
    crops: async () => { await r.hold(0.4); r.mark('crops_in'); await r.hold(1.0); await r.scroll(260, 0.9); await r.hold(0.3); await r.scroll(-260, 0.7); for (const k of c.picks) await r.tap(k); r.mark('crops_picked'); await r.hold(0.4); await r.tap('Continue'); },
    map: async () => {
      r.mark('map_load'); await r.hold(0.3);
      for (let i = 0; i < 40; i++) { const ok = await p.evaluate(() => !!document.querySelector('[role=dialog] canvas')); if (ok) break; await p.waitForTimeout(500); }
      await r.skip(1.0); await p.waitForTimeout(2000); await r.skip(0.5);
      r.mark('map'); await r.hold(1.6);
      await r.scroll(420, 0.9); r.mark('planters'); await r.hold(1.6);
      await r.tap('Looks good');
    },
    plan: async () => { r.mark('plan'); await r.hold(1.0); await r.scroll(330, 1.3); r.mark('plan_kit'); await r.hold(0.6); await r.scroll(420, 1.5); r.mark('plan_days'); await r.hold(0.8); await r.scroll(500, 1.2); await r.hold(0.6); r.mark('plan_end');
      for (let i = 0; i < 5; i++) { await r.tap('Start farming'); await r.hold(0.8); if (!(await p.getByRole('button', { name: 'Start farming' }).count())) break; await r.scroll(500, 0.6); } },
    home: async () => {
      for (let i = 0; i < 40; i++) { const ok = await p.evaluate(() => document.querySelectorAll('canvas').length > 0); if (ok) break; await p.waitForTimeout(500); }
      await r.skip(1.0); await p.waitForTimeout(2500); await r.skip(0.5);
      r.mark('home'); await r.hold(1.2); await r.scroll(380, 1.2); r.mark('home_jobs'); await r.hold(1.2);
    },
  };
  r.recording = false; await r.hold(0.25);
  for (const s of order.slice(order.indexOf(from), order.indexOf(to) + 1)) {
    r.recording = rec.includes(s);
    await steps[s]();
  }
  r.recording = false;
};
module.exports.CFG = CFG;
