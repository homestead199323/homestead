// Frame-stepped recorder for the real MyTerra app.
// The page clock is frozen; every frame advances it exactly 1/FPS s and takes
// a screenshot, so scrolling, drags, typing and the 3D scene play back smooth
// at FPS no matter how slow the machine renders. Interactions are logged with
// their frame numbers so the editor can draw the finger and sync the voice.
const { chromium, devices } = require('playwright');
const fs = require('fs');

class Rec {
  static async open({ out, fps = 30, time = '2027-04-17T10:30:00+01:00', url = 'http://127.0.0.1:5179/app.html' }) {
    const r = new Rec(); r.out = out; r.fps = fps; r.n = 0; r.events = []; r.marks = {}; r.recording = true;
    fs.mkdirSync(out, { recursive: true });
    r.browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
    r.ctx = await r.browser.newContext({ ...devices['iPhone 14'], viewport: { width: 390, height: 693 }, timezoneId: 'Europe/London', locale: 'en-GB' });
    await r.ctx.clock.install({ time: new Date(time) });
    r.p = await r.ctx.newPage();
    r.p.on('pageerror', e => console.log('PAGEERROR', e.message));
    await r.p.goto(url, { waitUntil: 'networkidle' });
    await r.p.waitForTimeout(1200);
    await r.p.clock.pauseAt(new Date(new Date(time).getTime() + 60000));
    return r;
  }
  get t() { return this.n / this.fps; }
  async frame() {
    await this.p.clock.runFor(1000 / this.fps);
    if (!this.recording) return;
    await this.p.screenshot({ type: 'jpeg', quality: 93, path: `${this.out}/${String(this.n).padStart(5, '0')}.jpg`, timeout: 240000 });
    this.n++;
  }
  async hold(sec) { const k = Math.round(sec * this.fps); for (let i = 0; i < k; i++) await this.frame(); }
  // advance app time without recording (skip boring waits)
  async skip(sec) { const was = this.recording; this.recording = false; await this.hold(sec); this.recording = was; }
  mark(name) { this.marks[name] = this.n; }
  loc(sel) { return typeof sel === 'string' ? this.p.getByRole('button', { name: sel, exact: false }).first() : sel; }
  async tap(sel, { pre = 0.28, post = 0.35 } = {}) {
    const l = this.loc(sel);
    try { await l.scrollIntoViewIfNeeded({ timeout: 1500 }); } catch (e) { /* moving 3D badge: tap where it is now */ }
    const b = await l.boundingBox();
    const x = b.x + b.width / 2, y = b.y + b.height / 2;
    if (this.recording) this.events.push({ type: 'tap', f: this.n + Math.round(pre * this.fps), x, y });
    await this.hold(pre);
    await this.p.mouse.click(x, y);
    await this.hold(post);
  }
  async type(locator, text, { perChar = 0.11 } = {}) {
    await this.tap(locator, { post: 0.15 });
    for (const ch of text) { await this.p.keyboard.type(ch); await this.hold(perChar); }
  }
  // finger scroll: eased wheel steps across `sec`
  async scroll(dy, sec = 0.7, at = { x: 195, y: 420 }) {
    const k = Math.max(2, Math.round(sec * this.fps)); let done = 0;
    await this.p.mouse.move(at.x, at.y);
    if (this.recording) this.events.push({ type: 'swipe', f0: this.n, f1: this.n + k, x0: at.x, y0: at.y, x1: at.x, y1: at.y - Math.sign(dy) * 160 });
    for (let i = 1; i <= k; i++) {
      const e = 0.5 - 0.5 * Math.cos(Math.PI * i / k); const step = Math.round(dy * e) - done; done += step;
      if (step) await this.p.mouse.wheel(0, step);
      await this.frame();
    }
  }
  // drag with the mouse (pointer events) from a to b over sec, eased
  async drag(a, b, sec = 1.2) {
    const k = Math.max(2, Math.round(sec * this.fps));
    if (this.recording) this.events.push({ type: 'drag', f0: this.n, f1: this.n + k, x0: a.x, y0: a.y, x1: b.x, y1: b.y });
    await this.p.mouse.move(a.x, a.y); await this.p.mouse.down();
    for (let i = 1; i <= k; i++) {
      const e = 0.5 - 0.5 * Math.cos(Math.PI * i / k);
      await this.p.mouse.move(a.x + (b.x - a.x) * e, a.y + (b.y - a.y) * e);
      await this.frame();
    }
    await this.p.mouse.up();
  }
  async save() {
    fs.writeFileSync(`${this.out}/events.json`, JSON.stringify({ fps: this.fps, frames: this.n, events: this.events, marks: this.marks }, null, 1));
    await this.browser.close();
  }
}
module.exports = Rec;
