// Part 1 scenario: build a farm from zero in the real app.
const Rec = require('./rec');
const EXPLORE = process.argv[2] === 'explore';
const ORBIT = process.argv[2] === 'orbit';
(async () => {
  const r = await Rec.open({ out: EXPLORE ? 'out/explore' : ORBIT ? 'episodes/ep1/orbit' : 'episodes/ep1/frames' });
  if (EXPLORE || ORBIT) r.recording = false;
  const p = r.p, ins = () => p.locator('[role=dialog] input:not([type=checkbox]):not([type=radio])');
  const t0 = Date.now(); const lap = (s) => console.log(s, 'frames', r.n, 'elapsed', Math.round((Date.now() - t0) / 1000) + 's');
  r.mark('land'); await r.hold(0.25);
  await r.tap('Get started'); await r.tap('Smallholding'); await r.tap('Continue');
  await r.type(ins().nth(0), '40'); await r.type(ins().nth(1), '25'); await r.hold(0.3); await r.tap('Continue');
  r.mark('sun');
  await r.tap('Western Europe'); await r.tap('Continue'); await r.tap('7h+'); await r.tap('All day'); await r.tap('Continue');
  r.mark('fast');
  await r.tap('Fresh food'); await r.tap('Self-sufficiency'); await r.tap('Continue');
  await r.tap('Total beginner'); await r.tap('Continue'); await r.tap('15 min a day'); await r.tap('Continue');
  await r.tap('2'); await r.tap('Cook it fresh'); await r.tap('Continue');
  r.mark('wants');
  await r.tap('Greenhouse'); await r.tap('Chicken coop'); await r.tap('Fruit trees'); await r.tap('Compost bin'); await r.hold(0.2); await r.tap('Continue');
  r.mark('plants'); await r.hold(0.4);
  await r.tap('Radish'); await r.tap('Zucchini'); await r.tap('Strawberry'); await r.hold(0.2); await r.tap('Continue');
  lap('onboarding');
  r.mark('build_load'); await r.hold(0.3);
  // let the 3D chunk load + first frames render without recording the wait
  for (let i = 0; i < 40; i++) { const ok = await p.evaluate(() => !!document.querySelector('[role=dialog] canvas')); if (ok) break; await p.waitForTimeout(500); }
  await r.skip(1.0); await p.waitForTimeout(2000); await r.skip(0.5);
  r.mark('build');
  const t3 = Date.now(); const n3 = r.n;
  await r.hold(EXPLORE ? 0.2 : 1.0);
  const cv = await p.locator('[role=dialog] canvas').first().boundingBox();
  console.log('map canvas', JSON.stringify(cv));
  await r.drag({ x: cv.x + cv.width * 0.75, y: cv.y + cv.height * 0.5 }, { x: cv.x + cv.width * 0.3, y: cv.y + cv.height * 0.55 }, EXPLORE ? 0.3 : 1.6);
  await r.hold(EXPLORE ? 0.1 : 0.6);
  if (!EXPLORE) console.log('3D ms/frame', Math.round((Date.now() - t3) / Math.max(1, r.n - n3)));
  await r.scroll(420, 0.8); await r.hold(0.8);
  await r.tap('Looks good');
  r.mark('plan'); await r.hold(0.5); await r.scroll(700, 1.2); await r.hold(0.4); await r.tap('Start farming');
  lap('plan');
  r.mark('home_load');
  for (let i = 0; i < 40; i++) { const ok = await p.evaluate(() => document.querySelectorAll('canvas').length > 0); if (ok) break; await p.waitForTimeout(500); }
  await r.skip(1.0); await p.waitForTimeout(2500); await r.skip(0.5);
  const dumpBtns = async (tag) => { const btns = await p.$$eval('button,[role=button]', bs => bs.filter(b => b.offsetParent).map(b => { const r = b.getBoundingClientRect(); return (b.getAttribute('aria-label') || b.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 40) + ' @' + Math.round(r.x) + ',' + Math.round(r.y) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height); })); console.log('--', tag, '\n' + btns.join('\n')); };
  const snap = async (name) => { const was = r.recording; await p.screenshot({ path: 'out/explore/' + name + '.jpg', type: 'jpeg', timeout: 240000 }); };
  if (EXPLORE && process.argv[3] === 'map') {
    require('fs').mkdirSync('out/explore', { recursive: true });
    await r.tap('Open the farm map'); await r.skip(1.5); await p.waitForTimeout(2500); await r.skip(0.5);
    await dumpBtns('fullmap'); await snap('fullmap');
    await r.tap('Growth preview and legend'); await r.skip(1.0);
    await dumpBtns('growth'); await snap('growth1');
    const rng = await p.$$eval('input[type=range]', xs => xs.map(x => { const b = x.getBoundingClientRect(); return [x.min, x.max, x.value, x.getAttribute('aria-label'), Math.round(b.x), Math.round(b.y), Math.round(b.width)]; }));
    console.log('ranges', JSON.stringify(rng));
    await r.tap('+2 mo'); await r.skip(0.8); await snap('growth2mo');
    await r.tap('Zoom in'); await r.skip(0.5); await r.tap('Zoom in'); await r.skip(0.8); await snap('growth2mo_zoom');
    await r.save(); lap('done'); return;
  }
  if (ORBIT) {
    await r.tap('Open the farm map'); await r.skip(1.2); await p.waitForTimeout(2500); await r.skip(0.6);
    r.recording = true; r.mark('orbit');
    // push in with the wheel (real zoom), then a slow pan
    for (let i = 0; i < 36; i++) { await p.mouse.move(195, 360); await p.mouse.wheel(0, -14); await r.frame(); }
    await r.drag({ x: 150, y: 430 }, { x: 235, y: 330 }, 2.4);
    await r.hold(0.3); r.mark('orbit_end');
    await r.save(); lap('done'); return;
  }
  if (!EXPLORE) {
  // ---- home → full-screen map → jobs pop-up (real) ----
  r.mark('game'); await r.hold(0.9);
  await r.tap('Open the farm map');
  await r.skip(1.2); await p.waitForTimeout(2500); await r.skip(0.4);
  r.mark('fullmap'); const tf = Date.now(), nf = r.n;
  await r.hold(0.5);
  await r.drag({ x: 230, y: 380 }, { x: 250, y: 300 }, 1.0);
  await r.tap('Zoom in'); await r.hold(0.7);
  await r.tap(p.getByRole('button', { name: /jobs waiting/ }).first());
  await r.hold(1.8); r.mark('popup_end');
  await r.tap(p.getByRole('button', { name: 'Close', exact: true })); await r.hold(0.3);
  r.mark('orbit'); await r.tap('Reset view'); await r.hold(0.6);
  await r.drag({ x: 160, y: 420 }, { x: 240, y: 360 }, 2.6); await r.hold(0.4);
  r.mark('end');
  console.log('3D ms/frame', Math.round((Date.now() - tf) / Math.max(1, r.n - nf)));
  }
  if (EXPLORE) {
    const btns = await p.$$eval('button,[role=button]', bs => bs.filter(b => b.offsetParent).map(b => { const r = b.getBoundingClientRect(); return (b.getAttribute('aria-label') || b.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 40) + ' @' + Math.round(r.x) + ',' + Math.round(r.y) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height); }));
    console.log(btns.join('\n'));
    r.recording = true; r.out = 'out/explore'; require('fs').mkdirSync('out/explore', { recursive: true }); await r.frame();
  }
  await r.save(); lap('done');
})();
