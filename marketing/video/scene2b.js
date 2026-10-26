// Part 2, map + growth section only (merged after the walk frames). Steady camera: taps for zoom, one slow pan.
const Rec = require('./rec'); const onboard = require('./onboard'); const walk = require('./walk');
(async () => {
  const r = await Rec.open({ out: 'episodes/ep2/frames_b' }); const p = r.p;
  await onboard(r); await walk(r); r.recording = true;
  r.mark('map_load'); await r.hold(0.3);
  await r.tap('Open the farm map');
  await r.skip(1.5); await p.waitForTimeout(2500); await r.skip(0.5);
  r.mark('map'); await r.hold(0.6);
  await r.tap('Growth preview and legend'); await r.hold(0.5);
  r.mark('zoom');
  await r.tap('Zoom in'); await r.hold(0.4); await r.tap('Zoom in'); await r.hold(0.5);
  r.mark('pan');
  await r.drag({ x: 100, y: 420 }, { x: 300, y: 110 }, 1.4); await r.hold(0.4);
  await r.tap('Zoom in'); await r.hold(0.6);
  r.mark('grow0');
  const sl = await p.locator('input[type=range]').first().boundingBox();
  const y = sl.y + sl.height / 2;
  await r.drag({ x: sl.x + 10, y }, { x: sl.x + sl.width - 10, y }, 5.0);
  r.mark('grow_end'); await r.hold(1.5); r.mark('end');
  console.log('done frames', r.n); await r.save();
})();
