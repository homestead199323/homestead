const Rec = require('./rec'); const fs = require('fs');
const env = process.argv[2] || 'balcony';
(async () => {
  const kv = JSON.parse(fs.readFileSync('episodes/state_' + env + '.json'));
  const r = await Rec.open({ out: 'out/xt', time: '2027-04-17T10:30:00+01:00', storage: kv }); const p = r.p; r.recording = false;
  const dump = async (tag, n = 700) => { const btns = await p.$$eval('button,[role=button],[role=tab]', bs => bs.filter(b => b.offsetParent).map(b => (b.getAttribute('aria-label') || b.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 36)).filter(Boolean)); console.log('--', tag, '\nBTN', btns.join(' ; ')); console.log('TXT', (await p.evaluate(() => document.body.innerText)).slice(0, n).replace(/\n+/g, ' | ')); };
  const snap = async (n) => { await p.screenshot({ path: 'out/xt/' + env + '_' + n + '.jpg', type: 'jpeg', timeout: 240000 }); };
  await r.skip(2.0); await p.waitForTimeout(2500); await r.skip(0.5);
  await dump('start', 300); await snap('start');
  for (const tab of ['My Space', 'Plan', 'Learn', 'Progress']) {
    await r.tap(p.getByRole('button', { name: new RegExp('^' + tab) }).last()); await r.skip(1.0); await p.waitForTimeout(1500); await r.skip(0.3);
    await dump(tab, 900); await snap(tab.replace(' ', ''));
  }
  await r.tap(p.getByRole('button', { name: /^Today/ }).last()); await r.skip(0.8);
  await r.tap('Start morning walk'); await r.skip(1.0); await dump('walk', 700); await snap('walk');
  await r.browser.close();
})();
