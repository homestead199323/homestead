import test from 'node:test';
import assert from 'node:assert/strict';
import {sunPosition,skyState,FIXED_SKY,weatherOf,windToScene} from '../src/features/grove/sky.js';

const near=(a,b,tol,msg)=>assert.ok(Math.abs(a-b)<=tol,`${msg}: ${a} vs ${b} (±${tol})`);
const finite=(o)=>Object.entries(o).forEach(([k,v])=>{if(typeof v==='number')assert.ok(Number.isFinite(v),`${k} finite`);if(Array.isArray(v))v.forEach((x,i)=>assert.ok(Number.isFinite(x),`${k}[${i}] finite`));});

test('sky: London noon midsummer ≈ 62°',()=>{near(sunPosition(new Date(2026,5,21,12,0),51.5).elevation,62,1.5,'elevation');});
test('sky: London noon midwinter ≈ 15°',()=>{near(sunPosition(new Date(2026,11,21,12,0),51.5).elevation,15,1.5,'elevation');});
test('sky: night at 23:00',()=>{assert.equal(skyState({date:new Date(2026,5,21,23,0),lat:51.5}).night,1);});
test("sky: fixed look matches today's sun",()=>{
  const L=Math.hypot(.55,1.25,-.35),want=[.55/L,1.25/L,-.35/L];
  want.forEach((v,i)=>near(FIXED_SKY.sunDir[i],v,.01,'sunDir['+i+']'));
  assert.equal(FIXED_SKY.sunIntensity,2.1);assert.equal(FIXED_SKY.fog,'#b4c69d');assert.equal(FIXED_SKY.night,0);
});
test('sky: no weather → clear calm',()=>{const w=weatherOf(null);assert.equal(w.precip,'none');assert.equal(w.cloud,0);assert.equal(w.windStrength,.15);});
test('sky: high latitude winter is finite',()=>{
  const p=sunPosition(new Date(2026,11,21,12,0),60);assert.ok(Number.isFinite(p.elevation)&&Number.isFinite(p.azimuth));
  finite(skyState({date:new Date(2026,11,21,12,0),lat:60}));finite(skyState({date:new Date(2026,11,21,3,0),lat:60}));
});
test('sky: weather table',()=>{
  assert.equal(weatherOf({code:3}).cloud,.85);assert.equal(weatherOf({code:61}).precip,'rain');assert.equal(weatherOf({code:73}).precip,'snow');
  assert.equal(weatherOf({code:45}).cloud,1);assert.equal(weatherOf({code:0,windKmh:90}).windStrength,1);assert.equal(weatherOf({code:0,windKmh:2}).windStrength,.15);
  const d=windToScene(180);near(Math.hypot(d[0],d[1]),1,1e-6,'unit');
});
test('sky: preset blend monotonic',()=>{
  const at=(el)=>skyState({date:new Date(2026,5,21,12,0),lat:51.5,elevationOverride:el}).sunIntensity;
  const s=[40,20,5,-10].map(at);for(let i=1;i<s.length;i++)assert.ok(s[i]<=s[i-1]+1e-9,'non-increasing at '+i);
});
test('sky: liveSky off is the fixed look whatever the clock',()=>{
  const s=skyState({date:new Date(2026,0,1,2,0),lat:51.5,liveSky:false});assert.deepEqual(s.sunDir,FIXED_SKY.sunDir);assert.equal(s.night,0);
});
