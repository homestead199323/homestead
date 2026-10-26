// Opens the app on the farm from state_after_p3.json at a later date (clock moved, state injected).
const Rec = require('./rec'); const fs = require('fs');
module.exports = async function later(out, time = '2027-06-24T10:30:00+01:00') {
  const kv = JSON.parse(fs.readFileSync(__dirname + '/episodes/state_after_p3.json'));
  const r = await Rec.open({ out, time, storage: kv }); const p = r.p; r.recording = false;
  await r.skip(1.0);
  if (await p.getByRole('button', { name: 'Maybe later' }).count()) { await r.tap('Maybe later'); await r.skip(0.5); }
  await r.tap(p.getByRole('button', { name: /^Today/ }).last()); await r.skip(1.0);
  // let the 3D hero paint
  for (let i = 0; i < 20; i++) { const ok = await p.evaluate(() => document.querySelectorAll('canvas').length > 0); if (ok) break; await p.waitForTimeout(400); }
  await r.skip(1.0); await p.waitForTimeout(1500); await r.skip(0.5);
  return r;
};
