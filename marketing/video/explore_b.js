const Rec = require('./rec');
const env = process.argv[2] || 'balcony';
(async () => {
  const r = await Rec.open({ out: 'out/x_' + env, time: '2027-04-17T10:30:00+01:00' }); const p = r.p; r.recording = false;
  const ins = () => p.locator('[role=dialog] input:not([type=checkbox]):not([type=radio])');
  const dump = async (tag, n = 600) => { const btns = await p.$$eval('button,[role=button],[role=tab]', bs => bs.filter(b => b.offsetParent).map(b => (b.getAttribute('aria-label') || b.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 36)).filter(Boolean)); console.log('--', tag, '\nBTN', btns.join(' ; ')); console.log('TXT', (await p.evaluate(() => document.body.innerText)).slice(0, n).replace(/\n+/g, ' | ')); };
  const snap = async (n) => { await p.screenshot({ path: 'out/x_' + env + '/' + n + '.jpg', type: 'jpeg', timeout: 240000 }); };
  await r.hold(0.25);
  await r.tap('Get started'); await dump('space', 500);
  await r.tap(env === 'balcony' ? 'Balcony' : 'Backyard'); await r.tap('Continue'); await dump('dims', 400);
  if (env === 'balcony') { await r.type(ins().nth(0), '4'); await r.type(ins().nth(1), '1.5'); await r.tap('Partly covered'); }
  else { await r.type(ins().nth(0), '10'); await r.type(ins().nth(1), '8'); }
  await r.tap('Continue'); await r.tap('Western Europe'); await r.tap('Continue'); await dump('sun', 600);
  await r.tap(env === 'balcony' ? '3–5h' : '5–7h'); await r.tap('Afternoon'); await r.tap('Continue'); await dump('goal', 500);
  await r.tap('Fresh food'); await r.tap('Continue'); await dump('exp', 300);
  await r.tap('Total beginner'); await r.tap('Continue'); await dump('time', 300);
  await r.tap('15 min a day'); await r.tap('Continue');
  await r.tap('2'); await r.tap('Cook it fresh'); await r.tap('Continue');
  if (env === 'balcony') { await r.tap('Pots & containers'); await r.tap('Basic tools'); } else { await r.tap('Raised bed'); await r.tap('Compost bin'); await r.tap('Basic tools'); }
  await r.tap('Continue'); await r.hold(0.4); await dump('crops', 900); await snap('crops');
  const picks = env === 'balcony' ? ['Lettuce','Mint','Swiss Chard'] : ['Lettuce','Radish','Kale'];
  for (const c of picks) await r.tap(c);
  await r.tap('Continue'); await r.hold(0.4);
  for (let i = 0; i < 40; i++) { const ok = await p.evaluate(() => !!document.querySelector('[role=dialog] canvas')); if (ok) break; await p.waitForTimeout(500); }
  await r.skip(1.0); await p.waitForTimeout(2000); await r.skip(0.5);
  await dump('map', 900); await snap('map');
  await r.tap('Looks good'); await r.hold(0.5); await dump('plan', 1200); await snap('plan');
  await r.scroll(700, 1.0); await snap('plan2'); await dump('plan2', 900);
  for (let i = 0; i < 5; i++) { await r.tap('Start farming'); await r.hold(0.8); if (!(await p.getByRole('button', { name: 'Start farming' }).count())) break; await r.scroll(500, 0.6); }
  for (let i = 0; i < 40; i++) { const ok = await p.evaluate(() => document.querySelectorAll('canvas').length > 0); if (ok) break; await p.waitForTimeout(500); }
  await r.skip(1.0); await p.waitForTimeout(2500); await r.skip(0.5);
  await dump('dash', 1200); await snap('dash');
  const kv = await p.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k !== '__seeded') o[k] = localStorage.getItem(k); } return o; });
  require('fs').writeFileSync('episodes/state_' + env + '.json', JSON.stringify(kv));
  console.log('STATE keys', Object.keys(kv).join(','), 'bytes', JSON.stringify(kv).length);
  await r.browser.close();
})();
