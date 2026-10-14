// Regression tests for the pre-launch audit fixes (2026-10-12).
import test from 'node:test';
import assert from 'node:assert/strict';
import {daysBetweenLocalKeys,localDayNumber,localDateFromKey,todayLocalKey,markTaskDone} from '../src/lib/utils.js';
import {parseTaskKey,buildTaskQueue} from '../src/lib/task-queue.js';
import {applyTaskCompletion,undoTaskCompletion} from '../src/features/quiet/complete-task.js';
import {applySeedlingStage} from '../src/lib/seedling-stage.js';
import {getRegionalVarieties} from '../src/lib/regional.js';
import {normalizeUnit,migratePantry} from '../src/lib/inventory.js';
import {CITY_DB} from '../src/data/cities.js';
import {fixture} from './fixture.js';


test('Day arithmetic is whole calendar days in every time zone (DST changes included)',()=>{
  // Spring forward (Europe: last Sunday of March) and fall back (last Sunday of October) — the
  // old floor((to-from)/864e5) undercounted by one for the whole summer in DST zones.
  assert.equal(daysBetweenLocalKeys('2027-03-25',new Date(2027,3,4)),10);
  assert.equal(daysBetweenLocalKeys('2026-03-01',new Date(2026,5,1)),92);
  assert.equal(daysBetweenLocalKeys('2026-10-20',new Date(2026,9,30)),10);
  assert.equal(daysBetweenLocalKeys('garbage',new Date()),0);
  // Consecutive local midnights always advance the ordinal by exactly one.
  for(const [y,m,d0] of [[2026,2,26],[2026,9,22],[2027,2,25]]){
    let prev=localDayNumber(new Date(y,m,d0));
    for(let i=1;i<8;i++){const n=localDayNumber(new Date(y,m,d0+i));assert.equal(n-prev,1,`day ${y}-${m+1}-${d0+i}`);prev=n;}
  }
  assert.equal(localDayNumber(localDateFromKey('1970-01-02')),1);
});

test('Completion keys with UUID ids parse into kind / id / suffix',()=>{
  const id='3fa85f64-5717-4562-b3fc-2c963f66afa6';
  assert.deepEqual(parseTaskKey(`plot-${id}-water`),{kind:'plot',id,suffix:'water'});
  assert.deepEqual(parseTaskKey(`plot-${id}-step-12`),{kind:'plot',id,suffix:'step-12'});
  assert.deepEqual(parseTaskKey(`animal-${id}-health`),{kind:'animal',id,suffix:'health'});
  assert.deepEqual(parseTaskKey('species-Guinea Fowl-eggs'),{kind:'species',id:'Guinea Fowl',suffix:'eggs'});
  assert.equal(parseTaskKey('nonsense'),null);
});

test('Animal periodic jobs are planned with a DST-safe day ordinal',()=>{
  // The same hen-house must get its weekly clean exactly once per 7-day window around the clock change.
  const data={...fixture,livestock:{animals:[{id:'hens',type:'Chicken',count:3,zone:'coop'}]}};
  for(const start of [new Date(2026,2,25),new Date(2026,9,21)]){
    let cleans=0;
    for(let i=0;i<14;i++){const d=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i);if(buildTaskQueue(data,{now:d}).some(t=>t.key==='species-Chicken-clean'))cleans++;}
    assert.equal(cleans,2);
  }
});

test('Harvest fallback scales the per-plant yield by the plant count; a typed 0 kg is kept as a failed crop',()=>{
  const plots=fixture.garden.plots.map(p=>p.id==='lettuce'?{...p,expectedYieldKg:undefined}:p);
  const data={...fixture,garden:{plots}};
  const task={key:'plot-lettuce-harvest',type:'harvest',plotId:'lettuce'};
  const next=applyTaskCompletion(data,task,undefined);
  assert.equal(next.pantry.items[0].qty,3); // Lettuce yld 0.3 kg/plant × 10 plants (was 0.3 for the whole bed)
  const failed=applyTaskCompletion(data,task,0,{allowZero:true});
  assert.equal((failed.pantry.items||[]).length,0);
  assert.equal(failed.garden.plots.find(p=>p.id==='lettuce').status,'harvested');
  assert.equal(failed.memory.harvests.at(-1).kg,0);
});

test('Done today → Undo un-ticks a care step and un-starts a sowing',()=>{
  const sow={id:'s',crop:'Lettuce',zone:'bed2',status:'planned',sowPending:true,sowFrom:'2026-01',plantCount:4,steps:[{l:'Sow',t:'',d:0,done:false},{l:'Thin',t:'',d:14,done:false}]};
  const data={...fixture,garden:{plots:[sow]}};
  const key='plot-s-step-0';
  const ticked=applyTaskCompletion(data,{key,type:'step',plotId:'s',stepIdx:0},null);
  const p1=ticked.garden.plots[0];
  assert.equal(p1.steps[0].done,true);
  assert.equal(p1.status,'planted');
  const undone=undoTaskCompletion(ticked,key);
  const p2=undone.garden.plots[0];
  assert.equal(p2.steps[0].done,false);
  assert.equal(p2.status,'planned');
  assert(!(undone.completions[todayLocalKey()]||[]).includes(key));
});

test('Planting out a seedling batch whose bed planting was deleted unlinks it instead of planting into nothing',()=>{
  const data={...fixture,nursery:{batches:[{id:'b1',crop:'Tomato',plants:6,cells:8,stage:'hardening',plotId:'gone',targetZoneId:'bed1',sowDate:'2026-03-01',plantOutDate:'2026-05-01'}]}};
  const next=applySeedlingStage(data,'b1','planted','2026-05-02');
  const b=next.nursery.batches[0];
  assert.equal(b.stage,'hardening');
  assert.equal(b.plotId,null);
  // The Today tick goes through markTaskDone → same behaviour.
  const viaTick=markTaskDone(data,'seed-b1-planted');
  assert.equal(viaTick.nursery.batches[0].plotId,null);
});

test('Regional variety lists come from the region, with the Western-Europe base as fallback',()=>{
  assert.equal(getRegionalVarieties('Potato','western_europe')[0].name,'Maris Piper');
  assert.equal(getRegionalVarieties('Potato','mediterranean')[0].name,'Spunta');
  assert.equal(getRegionalVarieties('Potato')[0].name,'Maris Piper');
  assert.deepEqual(getRegionalVarieties('Potato','us_cold').length>0,true);
  assert.deepEqual(getRegionalVarieties('',"mediterranean"),[]);
});

test('Pantry units: grams and millilitres convert; old lots get ids so FIFO takes the right one',()=>{
  assert.deepEqual(normalizeUnit('g',500),{unit:'kg',qty:0.5});
  assert.deepEqual(normalizeUnit('ml',250),{unit:'L',qty:0.25});
  const data={...fixture,pantry:{items:[{name:'Honey',unit:'kg',qty:1},{name:'Honey',unit:'kg',qty:2}]}};
  const ids=migratePantry(data).pantry.items.map(i=>i.id);
  assert.equal(ids.filter(Boolean).length,2);
  assert.notEqual(ids[0],ids[1]);
});

test('City list has no duplicate city/country rows',()=>{
  const seen=new Set();
  for(const c of CITY_DB){const k=`${c.city}|${c.country}`.toLowerCase();assert(!seen.has(k),`duplicate ${k}`);seen.add(k);}
});
