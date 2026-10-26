// Part 2: first seeds go in (morning walk) + growth preview. Steady camera: no drags, no orbit.
const Rec = require('./rec'); const onboard = require('./onboard');
(async () => {
  const r = await Rec.open({ out: 'episodes/ep2/frames' });
  const p = r.p; const t0 = Date.now(); const lap = (s) => console.log(s, 'frames', r.n, Math.round((Date.now() - t0) / 1000) + 's');
  await onboard(r); r.recording = true; lap('onboarded');
  r.mark('home'); await r.hold(1.0);
  await r.tap('Start morning walk'); await r.hold(0.4);
  await r.tap('Begin my walk'); r.mark('walk'); await r.hold(0.8);
  const nxt = () => p.locator('[role=dialog] button', { hasText: /next|Done 1 job/ }).last();
  for (let i = 0; i < 3; i++) {
    r.mark('s' + (i + 1)); await r.hold(0.7);
    await r.tap('Done'); await r.hold(0.5);
    await r.tap(nxt()); await r.hold(0.3);
  }
  r.mark('walk_end'); await r.hold(0.8);
  await r.tap('Back to my farm'); await r.hold(0.6);
  r.mark('map_load');
  await r.tap('Open the farm map');
  await r.skip(1.5); await p.waitForTimeout(2500); await r.skip(0.5);
  r.mark('map'); await r.hold(0.6);
  await r.tap('Growth preview and legend'); await r.hold(0.8);
  r.mark('grow0');
  const sl = await p.locator('input[type=range]').first().boundingBox();
  console.log('slider', JSON.stringify(sl));
  const y = sl.y + sl.height / 2;
  await r.drag({ x: sl.x + 10, y }, { x: sl.x + sl.width - 10, y }, 5.0);
  r.mark('grow_end'); await r.hold(1.5);
  r.mark('end');
  lap('done'); await r.save();
})();
