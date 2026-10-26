const Rec = require('./rec'); const fs = require('fs');
const env = process.argv[2] || 'balcony';
(async () => {
  const kv = JSON.parse(fs.readFileSync('episodes/state_' + env + '.json'));
  const r = await Rec.open({ out: 'out/xt', time: '2027-04-17T10:30:00+01:00', storage: kv }); const p = r.p; r.recording = false;
  const dump = async (tag, n = 700) => { const btns = await p.$$eval('button,[role=button],[role=tab]', bs => bs.filter(b => b.offsetParent).map(b => (b.getAttribute('aria-label') || b.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 36)).filter(Boolean)); console.log('--', tag, '\nBTN', btns.join(' ; ')); console.log('TXT', (await p.evaluate(() => document.body.innerText)).slice(0, n).replace(/\n+/g, ' | ')); };
  const snap = async (n) => { await p.screenshot({ path: 'out/xt/' + env + '_' + n + '.jpg', type: 'jpeg', timeout: 240000 }); };
  await r.skip(2.0); await p.waitForTimeout(2500); await r.skip(0.5);
  await r.tap('Open the farm map'); await r.skip(1.5); await p.waitForTimeout(2500); await r.skip(0.5);
  await dump('fullmap', 500); await snap('fullmap');
  await r.tap('Growth preview and legend'); await r.skip(1.0); await dump('growth', 500); await snap('growth1');
  await r.tap('+2 mo'); await r.skip(0.8); await p.waitForTimeout(1500); await snap('g2mo');
  await r.tap('Zoom in'); await r.tap('Zoom in'); await r.skip(0.8); await snap('g2mo_zoom');
  await r.browser.close();
})();
