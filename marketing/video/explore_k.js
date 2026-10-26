const Rec = require('./rec'); const fs = require('fs');
(async () => {
  const kv = JSON.parse(fs.readFileSync('episodes/state_balcony.json'));
  const r = await Rec.open({ out: 'out/xt', storage: kv }); const p = r.p; r.recording = false;
  await r.skip(2.0); await p.waitForTimeout(2500); await r.skip(0.5);
  await r.scroll(420, 0.6); await r.skip(0.3);
  const info = await p.evaluate(() => [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && /Lettuce seeds/.test(e.textContent)).map(e => { let a = e, p = []; for (let i = 0; i < 4 && a; i++, a = a.parentElement) p.push(a.tagName + (a.getAttribute('role') ? '[' + a.getAttribute('role') + ']' : '') + (a.getAttribute('aria-label') ? '{' + a.getAttribute('aria-label') + '}' : '')); return p.join(' < '); }));
  console.log(JSON.stringify(info));
  await p.screenshot({ path: 'out/xt/kit.jpg', type: 'jpeg' });
  await r.browser.close();
})();
