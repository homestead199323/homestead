// Runs the same onboarding as Part 1 (unrecorded) so later parts start on the same farm.
module.exports = async function onboard(r) {
  const p = r.p, ins = () => p.locator('[role=dialog] input:not([type=checkbox]):not([type=radio])');
  r.recording = false;
  await r.hold(0.25);
  await r.tap('Get started'); await r.tap('Smallholding'); await r.tap('Continue');
  await r.type(ins().nth(0), '40'); await r.type(ins().nth(1), '25'); await r.hold(0.3); await r.tap('Continue');
  await r.tap('Western Europe'); await r.tap('Continue'); await r.tap('7h+'); await r.tap('All day'); await r.tap('Continue');
  await r.tap('Fresh food'); await r.tap('Self-sufficiency'); await r.tap('Continue');
  await r.tap('Total beginner'); await r.tap('Continue'); await r.tap('15 min a day'); await r.tap('Continue');
  await r.tap('2'); await r.tap('Cook it fresh'); await r.tap('Continue');
  await r.tap('Greenhouse'); await r.tap('Chicken coop'); await r.tap('Fruit trees'); await r.tap('Compost bin'); await r.hold(0.2); await r.tap('Continue');
  await r.hold(0.4);
  await r.tap('Radish'); await r.tap('Zucchini'); await r.tap('Strawberry'); await r.hold(0.2); await r.tap('Continue');
  await r.hold(0.3);
  for (let i = 0; i < 40; i++) { const ok = await p.evaluate(() => !!document.querySelector('[role=dialog] canvas')); if (ok) break; await p.waitForTimeout(500); }
  await r.skip(1.0); await p.waitForTimeout(2000); await r.skip(0.5);
  await r.hold(0.5);
  await r.tap('Looks good');
  await r.hold(0.5); await r.scroll(700, 1.2); await r.hold(0.4);
  for (let i = 0; i < 5; i++) {
    await r.tap('Start farming'); await r.hold(0.8);
    if (!(await p.getByRole('button', { name: 'Start farming' }).count())) break;
    await r.scroll(500, 0.6); await r.hold(0.3);
  }
  for (let i = 0; i < 40; i++) { const ok = await p.evaluate(() => document.querySelectorAll('canvas').length > 0); if (ok) break; await p.waitForTimeout(500); }
  await r.skip(1.0); await p.waitForTimeout(2500); await r.skip(0.5);
};
