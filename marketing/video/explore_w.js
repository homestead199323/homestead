const Rec = require('./rec'); const fs = require('fs');
const env = process.argv[2] || 'garden';
(async () => {
  const kv = JSON.parse(fs.readFileSync('episodes/state_' + env + '.json'));
  const r = await Rec.open({ out: 'out/xt', time: '2027-04-17T10:30:00+01:00', storage: kv }); const p = r.p; r.recording = false;
  const dump = async (tag, n = 700) => { const btns = await p.$$eval('button,[role=button],[role=tab]', bs => bs.filter(b => b.offsetParent).map(b => (b.getAttribute('aria-label') || b.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 36)).filter(Boolean)); console.log('--', tag, '\nBTN', btns.join(' ; ')); console.log('TXT', (await p.evaluate(() => document.body.innerText)).slice(0, n).replace(/\n+/g, ' | ')); };
  const snap = async (n) => { await p.screenshot({ path: 'out/xt/' + env + '_' + n + '.jpg', type: 'jpeg', timeout: 240000 }); };
  await r.skip(2.0); await p.waitForTimeout(2500); await r.skip(0.5);
  await r.tap('Start morning walk'); await r.skip(0.8); await r.tap('Begin my walk'); await r.skip(1.0); await p.waitForTimeout(1500); await dump('walk1', 800); await snap('walk1');
  for (let i = 2; i < 6; i++) {
    const nx = p.getByRole('button', { name: /Next|Continue|Done|Finish|Skip|Looks|All good|Seen/i }).first();
    if (!(await nx.count())) break;
    await r.tap(nx); await r.skip(0.9); await p.waitForTimeout(800); await dump('walk' + i, 800); await snap('walk' + i);
  }
  await r.browser.close();
})();
