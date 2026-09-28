import test from 'node:test';
import assert from 'node:assert/strict';
import {companionsFor,relation,growthOf,validatePlantingLayout,bedLength,bedRows,animalZone,freePlantingRows} from '../src/features/quiet/farm-model.js';
import {planRound,roundMinutes} from '../src/features/quiet/walk-model.js';
import {applyTaskCompletion} from '../src/features/quiet/complete-task.js';
import {buildTaskQueue} from '../src/lib/task-queue.js';
import {fixture} from './fixture.js';
import {todayLocalKey} from '../src/lib/utils.js';
const z={id:'bed',type:'veg',wM:4,hM:2,rowCount:4};
test('Companions respect asymmetric conflicts and existing bed neighbours',()=>{assert.equal(relation('Basil','Rosemary'),'avoid');assert.equal(relation('Tomato','Basil'),'good');const p=[{zone:'bed',crop:'Rosemary',status:'planted'}];const result=companionsFor('Tomato','bed',p,['Basil','Carrot','Lettuce']);assert(!result.suggestions.some(x=>x.name==='Basil'));assert(result.suggestions.some(x=>x.name==='Carrot'));assert.equal(companionsFor('Basil','bed',p,[]).conflicts[0],'Rosemary');});
test('Harvested crops do not influence companion suggestions',()=>{assert.equal(companionsFor('Basil','bed',[{zone:'bed',crop:'Rosemary',status:'harvested'}],[]).conflicts.length,0);});
test('Unrecorded relationships remain unknown',()=>assert.equal(relation('Unknown crop','Tomato'),'unknown'));
test('Growth uses saved variety harvest date and never calls 85 percent ready',()=>{const p={status:'planted',plantDate:'2026-01-01',harvestDate:'2026-04-11'};assert.equal(growthOf(p,{days:60},'2026-03-27').index,4);assert.equal(growthOf(p,{days:60},'2026-04-11').index,5);assert.equal(growthOf({...p,observedStage:2},{days:60},'2026-04-11').estimated,false);assert.equal(growthOf({status:'planned'},null,'2026-01-01').index,0);});
test('Rows reject overlap, fractions, overflow and excess plant counts',()=>{const p=[{id:'a',zone:'bed',layout:{startRow:1,rowCount:1,lengthM:4},status:'planted'}];assert.match(validatePlantingLayout(z,p,{startRow:1,rowCount:1,lengthM:4},3),/already/);assert.match(validatePlantingLayout(z,p,{startRow:4,rowCount:2,lengthM:4},3),/within/);assert.match(validatePlantingLayout(z,[],{startRow:1,rowCount:1,lengthM:5},3),/length/);assert.match(validatePlantingLayout(z,[],{startRow:1,rowCount:1,lengthM:4},3.5),/whole/);assert.match(validatePlantingLayout(z,[],{startRow:1,rowCount:1,lengthM:4},20,50),/fits/);assert.equal(validatePlantingLayout(z,p,{startRow:2,rowCount:1,lengthM:4},4),'');});
test('Rotation retains physical row length',()=>{assert.equal(bedLength({...z,wM:2,hM:4,rowAxis:'vertical'}),4);assert.equal(bedRows({...z,rowAxis:'vertical'}),4);});
test('Animals assigned to one area and bees resolve to beehives',()=>{assert.equal(animalZone({type:'Chicken'},fixture.zones).id,'coop');assert.equal(animalZone({type:'Bee'},fixture.zones).id,'hive');assert.equal(animalZone({type:'Chicken',zone:'hive'},fixture.zones).id,'hive');});
test('Walk stops are per crop planting; full round adds task-free areas but not the house',()=>{const tasks=[{key:'a',plotId:'tom',daysOut:0,type:'water'},{key:'b',plotId:'basil',daysOut:0,type:'step'},{key:'c',plotId:'tom',daysOut:0,type:'step'}];const quick=planRound(tasks,fixture);assert.equal(quick.length,2);assert.deepEqual(quick.map(s=>s.plotId).sort(),['basil','tom']);assert.equal(quick.find(s=>s.plotId==='tom').tasks.length,2);assert.notEqual(quick[0].yM,quick[1].yM);const full=planRound([],fixture,'full');assert.equal(full.length,6);assert(!full.some(s=>s.type==='house'));assert.equal(planRound([],fixture,'full','hive')[0].id,'hive');assert(roundMinutes(planRound(tasks,fixture),fixture)>0);});
test('Completing a harvest cannot duplicate pantry inventory',()=>{const task={key:'plot-lettuce-harvest',type:'harvest',plotId:'lettuce'};const next=applyTaskCompletion(fixture,task,2.4);assert.equal(next.pantry.items.length,1);assert.equal(next.pantry.items[0].qty,2.4);assert.equal(next.garden.plots.find(p=>p.id==='lettuce').status,'harvested');assert.equal(applyTaskCompletion(next,task,2.4),next);assert(next.completions[todayLocalKey()].includes(task.key));});
test('Egg completion is idempotent and care steps persist',()=>{const task={key:'species-Chicken-eggs',type:'eggs'};const next=applyTaskCompletion(fixture,task,3);assert.equal(applyTaskCompletion(next,task,3).pantry.items.length,1);const data={...fixture,garden:{plots:[{id:'a',steps:[{done:false}]}]}};assert.equal(applyTaskCompletion(data,{type:'step',plotId:'a',stepIdx:0,key:'step'},null).garden.plots[0].steps[0].done,true);});
test('Queue and visual harvest windows agree with stored date',()=>{const queue=buildTaskQueue(fixture);assert(queue.some(t=>t.plotId==='lettuce'&&t.type==='harvest'));assert(!queue.some(t=>t.plotId==='tom'&&t.type==='harvest'));});

test('Guinea fowl use a poultry shelter rather than an unrelated pasture',()=>{assert.equal(animalZone({type:'Guinea Fowl'},fixture.zones)?.id,'coop');});

import {plantedRows,plantPosition,accessPaths,roofBays,buildingScale} from '../src/features/grove/aerial-layout.js';
test('Overhead rows distribute every recorded plant and preserve partial row lengths',()=>{const zone={...z,rowCount:4};const rows=plantedRows(zone,[{id:'a',zone:'bed',crop:'Tomato',plantCount:7,layout:{startRow:2,rowCount:2,lengthM:2},status:'planted'}]);assert.deepEqual(rows.map(r=>r.count),[0,4,3,0]);assert.equal(rows[1].fraction,.5);assert.equal(rows[0].planting,undefined);});
test('Paths reach area edges without running through buildings or growing areas',()=>{const zones=[{id:'a',xM:4,yM:2,wM:4,hM:4},{id:'b',xM:4,yM:8,wM:3,hM:3},{id:'c',xM:9,yM:2,wM:2,hM:3}];const paths=accessPaths(zones,14,14);assert.equal(paths.length,3);for(const path of paths){assert(paths.indexOf(path)===0?path[0].xM===7&&path[0].yM===14:paths.slice(0,paths.indexOf(path)).some(line=>line.slice(1).some((b,i)=>{const a=line[i],p=path[0];return a.xM===b.xM?p.xM===a.xM&&p.yM>=Math.min(a.yM,b.yM)&&p.yM<=Math.max(a.yM,b.yM):p.yM===a.yM&&p.xM>=Math.min(a.xM,b.xM)&&p.xM<=Math.max(a.xM,b.xM);})));for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i];assert(a.xM===b.xM||a.yM===b.yM);for(const z of zones){const crosses=a.yM===b.yM?a.yM>z.yM&&a.yM<z.yM+z.hM&&Math.max(a.xM,b.xM)>z.xM&&Math.min(a.xM,b.xM)<z.xM+z.wM:a.xM>z.xM&&a.xM<z.xM+z.wM&&Math.max(a.yM,b.yM)>z.yM&&Math.min(a.yM,b.yM)<z.yM+z.hM;assert(!crosses,`Path crosses ${z.id}`);}}}});
test('Roof structure adds bays as a greenhouse expands, without unbounded detail',()=>{assert(roofBays(6,1.1)>roofBays(2,1.1));assert.equal(roofBays(1000),80);assert.equal(roofBays(.2),2);});

test('Offset planting preserves count and shifts alternate rows by half a shared pitch',()=>{
 const plots=[{id:'offset',zone:'bed',crop:'Lettuce',plantCount:15,layout:{startRow:1,rowCount:3,lengthM:4,pattern:'offset'}}];
 const rows=plantedRows({...z,rowCount:3},plots);
 assert.equal(rows.reduce((n,r)=>n+r.count,0),15);
 const pitch=plantPosition(rows[0],1)-plantPosition(rows[0],0);
 assert(Math.abs(plantPosition(rows[1],0)-plantPosition(rows[0],0)-pitch/2)<1e-10);
 assert.equal(plantPosition(rows[2],0),plantPosition(rows[0],0));
 for(const row of rows)for(let i=0;i<row.count;i++)assert(plantPosition(row,i)>0&&plantPosition(row,i)<1);
});
test('Offset layout survives normalization, uneven counts, rotation and pagination',()=>{
 const plots=[{zone:'bed',crop:'Carrot',plantCount:605,plantingPattern:'offset',layout:{startRow:1,rowCount:3,lengthM:4}}];
 const rows=plantedRows(z,plots),rotated=plantedRows({...z,wM:2,hM:4,rowAxis:'vertical'},plots);
 assert.deepEqual(rows.map(r=>r.count),[202,202,201,0]);
 assert.equal(rows[0].planting.layout.pattern,'offset');
 assert.equal(plantPosition(rows[1],101),plantPosition(rotated[1],101));
 assert(plantPosition(rows[2],200)<1);
 assert.match(validatePlantingLayout(z,[],{startRow:1,rowCount:1,lengthM:4,pattern:'offset'},3),/at least two/);
});
test('Free row suggestions never overwrite another planting',()=>{
 const plots=[{zone:'bed',layout:{startRow:2,rowCount:1,lengthM:4}}];
 assert.deepEqual(freePlantingRows(z,plots),{startRow:3,rowCount:2,lengthM:4});
 assert.equal(freePlantingRows(z,[{zone:'bed',layout:{startRow:1,rowCount:4,lengthM:4}}]).rowCount,0);
});
test('Offset spacing reserves the half-step and rejects tightly packed adjacent rows',()=>{
 assert.match(validatePlantingLayout({id:'bed',wM:3,hM:2,rowCount:2},[],{startRow:1,rowCount:2,lengthM:3,pattern:'offset'},24,25),/fits/);
 assert.equal(validatePlantingLayout({id:'bed',wM:3,hM:2,rowCount:2},[],{startRow:1,rowCount:2,lengthM:3,pattern:'offset'},20,25),'');
 assert.match(validatePlantingLayout({id:'bed',wM:3,hM:.3,rowCount:3},[],{startRow:1,rowCount:3,lengthM:3,pattern:'offset'},18,40),/too close/);
});
test('An observed growth stage can describe a crop whose planting date is unknown',()=>{
 const growth=growthOf({status:'planned',observedStage:3},{days:45},'2026-09-23');
 assert.equal(growth.index,3);assert.equal(growth.estimated,false);
});

import {planPlanting,physicalPoints,cropFitsZone} from '../src/features/quiet/planting-plan.js';
import {plotAreaM2,expectedYield} from '../src/lib/farm-calc.js';
const tomato={name:'Tomato',cat:'Vegetable',spacing:50},apple={name:'Apple',cat:'Fruit',spacing:300};
test('Plant counts derive rows; row counts derive capacity and harvest estimates',()=>{
 const bed={...z,hM:3};
 const a=planPlanting(bed,[],{plantCount:20},tomato);assert.equal(a.error,'');assert.equal(a.rows,3);assert.equal(a.count,20);
 const b=planPlanting(bed,[],{mode:'rows',rowCount:3,spacingCM:25},tomato);assert.equal(b.error,'');assert.equal(b.count,45);assert.equal(b.layout.rowSpacingCM,25);
 assert.equal(expectedYield('Tomato',b.count,'plants',2),90);
 assert.equal(plotAreaM2({plantCount:b.count,layout:b.layout}),3);
 assert.equal(planPlanting(bed,[],{plantCount:20,spacingCM:25},tomato).rows,2);
});
test('Modern offset rows retain exact spacing, partial final row and half-pitch staggering',()=>{
 const bed={...z,wM:4.2,hM:3};const plan=planPlanting(bed,[],{plantCount:20,pattern:'offset'},tomato);assert.equal(plan.error,'');
 const plot={zone:'bed',crop:'Tomato',plantCount:plan.count,layout:plan.layout};const rows=plantedRows(bed,[plot]);assert.deepEqual(rows.map(r=>r.count),[8,7,5]);
 const pts=physicalPoints(bed,plot);assert.equal(pts.length,20);assert.equal(pts[1].xM-pts[0].xM,.5);assert.equal(pts[8].xM-pts[0].xM,.25);assert(Math.abs(pts[8].yM-pts[0].yM-.433)<1e-9);
 for(const p of pts)assert(p.xM>0&&p.xM<bed.wM&&p.yM>0&&p.yM<bed.hM);
 const vertical={...bed,wM:3,hM:4.2,rowAxis:'vertical'},rot=physicalPoints(vertical,plot);assert.equal(rot[8].xM,pts[8].yM);assert.equal(rot[8].yM,pts[8].xM);
});
test('New layouts reject invalid counts, overflow and overlapping beds without replacing plantings',()=>{
 const bed={...z,hM:2};const a=planPlanting(bed,[],{plantCount:14},tomato);assert.equal(a.error,'');const saved={id:'a',zone:'bed',plantCount:a.count,layout:a.layout};
 assert.match(planPlanting(bed,[saved],{plantCount:14},tomato).error,/free bed width/);
 assert.match(planPlanting(bed,[saved],{plantCount:1,startM:.1},tomato).error,/overlaps/);
 assert.equal(planPlanting(bed,[saved],{plantCount:14},tomato,'a').error,'');
 for(const plantCount of [-1,0,1.5,Infinity])assert(planPlanting(bed,[],{plantCount},tomato).error);
 assert(planPlanting(bed,[],{plantCount:5,spacingCM:0},tomato).error);
 const overflow=planPlanting(bed,[],{plantCount:100},tomato);assert.equal(overflow.count,100);assert.equal(overflow.rows,15);assert(overflow.error);
});
test('Orchards reject vegetables and preserve spaced, deterministic scattered tree positions',()=>{
 const orchard={id:'fruit',type:'orchard',wM:20,hM:20};assert.equal(cropFitsZone(tomato,orchard),false);assert(planPlanting(orchard,[],{plantCount:3},tomato).error);
 const plan=planPlanting(orchard,[],{plantCount:8,pattern:'scatter'},apple);assert.equal(plan.error,'');assert.equal(plan.rows,0);assert.equal(plan.layout.points.length,8);
 assert.deepEqual(planPlanting(orchard,[],{plantCount:8,pattern:'scatter'},apple).layout.points,plan.layout.points);
 const plot={id:'a',zone:'fruit',plantCount:8,layout:plan.layout};const next=planPlanting(orchard,[plot],{plantCount:3,pattern:'scatter'},apple);assert.equal(next.error,'');
 const all=[...plan.layout.points,...next.layout.points];for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++)assert(Math.hypot(all[i].xM-all[j].xM,all[i].yM-all[j].yM)>=3);
});
test('Nearby manually drawn paths are connection points',()=>{
 const paths=accessPaths([{xM:2,yM:2,wM:2,hM:2}],20,20,[{kind:'path',points:[{xM:1,yM:6},{xM:8,yM:6}]}]);assert.equal(paths.length,1);assert.equal(paths[0][0].yM,6);assert.equal(paths[0][0].xM,3);
});
test('Architectural details remain metre-sized rather than scaling with a building',()=>{
 assert.equal(buildingScale(10,10,'barn').door,buildingScale(20,20,'barn').door);assert.equal(buildingScale(10,10,'barn').roofDepth,7.8);assert.equal(buildingScale(3,2,'barn').small,true);
 assert.equal(buildingScale(10,10,'house').window,buildingScale(20,20,'house').window);
});

import { spacingGuide, crowdingFactor } from '../src/data/spacing.js';
import { plantingInput, plantingRows, occupiedRects } from '../src/features/quiet/planting-plan.js';
import { modernRect, axisOf } from '../src/features/quiet/farm-model.js';
test('A planting can run vertically in a horizontal bed and rotates with the bed', () => {
  const bed = { id: 'bed', type: 'veg', wM: 4, hM: 2.4 };
  const carrot = { name: 'Carrot', cat: 'Vegetable', spacing: 4 };
  const plan = planPlanting(bed, [], { plantCount: 120, axis: 'vertical', spacingCM: 4, rowSpacingCM: 15 }, carrot);
  assert.equal(plan.error, '');
  assert.equal(axisOf(bed, plan.layout), 'vertical');
  const rows = plantingRows(bed, { plantCount: 120, layout: plan.layout });
  assert(rows.every((r) => r.vertical));
  assert.equal(rows.reduce((n, r) => n + r.points.length, 0), 120);
  for (const r of rows) assert(r.points.every((q) => q.xM === r.atM && q.yM > 0 && q.yM < bed.hM));
  const rotated = { ...bed, wM: 2.4, hM: 4, rowAxis: 'vertical' };
  assert.equal(axisOf(rotated, plan.layout), 'horizontal');
});
test('Plantings in both directions share a bed without overlapping', () => {
  const bed = { id: 'bed', type: 'veg', wM: 4, hM: 2.4 };
  const tomato = { name: 'Tomato', cat: 'Vegetable', spacing: 50 };
  const carrot = { name: 'Carrot', cat: 'Vegetable', spacing: 4 };
  const a = planPlanting(bed, [], { plantCount: 7, spacingCM: 50, rowSpacingCM: 60 }, tomato);
  const saved = { id: 'a', zone: 'bed', plantCount: a.count, layout: a.layout };
  const b = planPlanting(bed, [saved], { plantCount: 100, axis: 'vertical', spacingCM: 4, rowSpacingCM: 15 }, carrot);
  assert.equal(b.error, '');
  assert.equal(b.shortened, true);
  const r1 = modernRect(bed, a.layout), r2 = modernRect(bed, b.layout);
  assert(!(r1.x0 < r2.x1 && r1.x1 > r2.x0 && r1.y0 < r2.y1 && r1.y1 > r2.y0));
  assert(r2.y1 <= bed.hM + 1e-9 && r2.x1 <= bed.wM + 1e-9);
  assert.equal(occupiedRects(bed, [saved, { id: 'b', zone: 'bed', plantCount: b.count, layout: b.layout }]).length, 2);
});
test('Plant count fills rows and row count fills plants', () => {
  const bed = { id: 'bed', type: 'veg', wM: 4, hM: 2.4 };
  const lettuce = { name: 'Lettuce', cat: 'Vegetable', spacing: 25 };
  const byPlants = planPlanting(bed, [], plantingInput({ plantCount: 30 }, lettuce, bed), lettuce);
  assert.equal(byPlants.error, '');
  assert.equal(byPlants.rows, 2);
  const byRows = planPlanting(bed, [], plantingInput({ mode: 'rows', rowCount: 3 }, lettuce, bed), lettuce);
  assert.equal(byRows.count, 45);
});
test('Grid defaults follow the pattern and crowding caps yield', () => {
  const carrot = { name: 'Carrot', spacing: 4 };
  assert.deepEqual(spacingGuide(carrot, 'rows'), { inRowCM: 4, rowCM: 15, hexCM: 8 });
  assert.equal(spacingGuide(carrot, 'offset').rowCM, 6.9);
  assert.equal(crowdingFactor(carrot, 4, 15), 1);
  assert.equal(crowdingFactor(carrot, 8, 6.9), 1);
  assert(crowdingFactor(carrot, 4, 3.5) < 0.3);
  const bed = { id: 'bed', type: 'veg', wM: 4, hM: 2.4 };
  const input = plantingInput({ pattern: 'offset', plantCount: 10 }, carrot, bed);
  assert.equal(input.spacingCM, 8);
  assert.equal(input.rowSpacingCM, 6.9);
});
test('Orchards default to natural scattered trees, and shuffling moves them', () => {
  const orchard = { id: 'fruit', type: 'orchard', wM: 20, hM: 20 };
  const apple = { name: 'Apple', cat: 'Fruit', spacing: 300 };
  const input = plantingInput({ plantCount: 5 }, apple, orchard);
  assert.equal(input.pattern, 'scatter');
  const a = planPlanting(orchard, [], input, apple);
  const b = planPlanting(orchard, [], { ...input, seed: '42' }, apple);
  assert.equal(a.error, '');
  assert.equal(b.error, '');
  assert.notDeepEqual(a.layout.points, b.layout.points);
});
import { planBatch, nurseryTasks, scheduleOf, nextStage } from '../src/features/nursery/nursery-model.js';
import { markTaskDone } from '../src/lib/utils.js';
import { propagationOf } from '../src/data/propagation.js';
test('Seedling batch counts back from planting out and sows spare cells', () => {
  const tomato = { name: 'Tomato', days: 95 };
  assert.equal(propagationOf(tomato).method, 'transplant');
  assert.equal(propagationOf({ name: 'Carrot' }).method, 'direct');
  const { batch, warning } = planBatch({ crop: tomato, zoneId: 'nur', plants: 10, plantOutDate: '2027-05-20', id: 'b', today: '2027-03-01' });
  assert.equal(batch.sowDate, '2027-04-01');
  assert.equal(batch.cells, 12);
  assert.equal(warning, '');
  const s = scheduleOf(batch);
  assert.equal(s.sprouted, '2027-04-08');
  assert.equal(s.potted, '2027-04-22');
  assert.equal(s.hardening, '2027-05-13');
  const late = planBatch({ crop: tomato, zoneId: 'nur', plants: 10, plantOutDate: '2027-05-20', id: 'b', today: '2027-04-10' });
  assert.equal(late.batch.sowDate, '2027-04-10');
  assert.match(late.warning, /9 days ago/);
});
test('Nursery tasks appear when due and ticking them moves the batch and plants out the bed', () => {
  const today = new Date().toLocaleDateString('en-CA');
  const { batch } = planBatch({ crop: { name: 'Lettuce', days: 60 }, zoneId: 'nur', plants: 8, plantOutDate: today, plotId: 'p1', targetZoneId: 'bed1', id: 'b1', today });
  let data = {
    zones: [{ id: 'nur', type: 'nursery', name: 'Nursery' }, { id: 'bed1', type: 'veg', name: 'Bed' }],
    garden: { plots: [{ id: 'p1', crop: 'Lettuce', zone: 'bed1', status: 'planned', plantDate: '', growDays: 60 }] },
    nursery: { batches: [{ ...batch, sowDate: today }] },
  };
  const t1 = nurseryTasks(data, today);
  assert(t1.some((t) => t.key === 'seed-b1-sown' && t.daysOut === 0 && t.zoneId === 'nur'));
  data = markTaskDone(data, 'seed-b1-sown');
  assert.equal(data.nursery.batches[0].stage, 'sown');
  assert(nurseryTasks(data, today).some((t) => t.key === 'nursery-nur-check'));
  assert.equal(nextStage(data.nursery.batches[0]), 'sprouted');
  data = markTaskDone(data, 'seed-b1-planted');
  assert.equal(data.nursery.batches[0].stage, 'planted');
  assert.equal(data.garden.plots[0].status, 'planted');
  assert.equal(data.garden.plots[0].plantDate, today);
  assert(data.garden.plots[0].harvestDate > today);
  assert.equal(nurseryTasks(data, today).length, 0);
});
test('Walk visits the nursery for seedling tasks', () => {
  const tasks = [{ key: 'seed-x-sown', zoneId: 'nur', daysOut: 0, type: 'seedling' }];
  const d = { farmW: 10, farmH: 10, zones: [{ id: 'nur', type: 'nursery', name: 'Nursery', xM: 1, yM: 1, wM: 2, hM: 1 }], garden: { plots: [] } };
  const stops = planRound(tasks, d);
  assert.equal(stops.length, 1);
  assert.equal(stops[0].zoneId, 'nur');
});
import { sowMonths, suggestDates, seasonNote, plantOutWindow, frostDates } from '../src/features/nursery/nursery-model.js';
import { applySeedlingStage } from '../src/lib/seedling-stage.js';
test('Nursery dates follow the region frost dates', () => {
  assert.deepEqual([...sowMonths('Nov-Feb')].sort((a, b) => a - b), [0, 1, 10, 11]);
  const we = frostDates({ region: 'western_europe' }), med = frostDates({ region: 'mediterranean' });
  assert.equal(we.last, '05-01');
  assert.equal(frostDates({ region: 'mediterranean', frost: { last: '04-15' } }).last, '04-15');
  const tomato = { name: 'Tomato', days: 95 };
  // Tender: two weeks after last frost; sow seven weeks before that.
  assert.deepEqual(suggestDates(tomato, '2026-09-26', we), { sowDate: '2027-03-27', plantOutDate: '2027-05-15', window: plantOutWindow(tomato, 2027, we) });
  assert.equal(suggestDates(tomato, '2026-09-26', med).plantOutDate, '2027-03-29');
  // Under glass the season opens four weeks earlier.
  assert.equal(suggestDates(tomato, '2026-09-26', we, true).plantOutDate, '2027-04-17');
  // Hardy: three weeks before last frost; and still possible in autumn when there is time.
  const cabbage = { name: 'Cabbage', days: 70 };
  assert.equal(suggestDates(cabbage, '2027-01-10', we).plantOutDate, '2027-04-10');
  assert.equal(suggestDates(cabbage, '2027-06-01', we).plantOutDate, '2027-07-06');
  assert.match(seasonNote(tomato, '2027-04-20', we), /frost-tender/);
  assert.equal(seasonNote(tomato, '2027-05-20', we), '');
  assert.match(seasonNote(tomato, '2027-09-01', we), /may not mature/);
});
test('Sowing on a different day moves the plant-out date with it', () => {
  const data = { garden: { plots: [{ id: 'p', status: 'planned', plannedDate: '2027-05-15' }] }, nursery: { batches: [{ id: 'b', sowDate: '2027-03-27', plantOutDate: '2027-05-15', plotId: 'p', stageDates: {} }] } };
  const next = applySeedlingStage(data, 'b', 'sown', '2027-04-03');
  assert.equal(next.nursery.batches[0].plantOutDate, '2027-05-22');
  assert.equal(next.garden.plots[0].plannedDate, '2027-05-22');
});
import { TRAYS, suggestTrays } from '../src/data/trays.js';
test('Tray sizes are whole grids and batches remember their trays', () => {
  for (const t of TRAYS) assert(Number.isInteger(t.rows) && t.rows * t.cols === t.cells);
  const t0 = suggestTrays({ name: 'Tomato' });
  assert.deepEqual([t0.tray, t0.potTray], [104, 24]);
  // The crop sets the cell size; the count picks the tray with the fewest empty cells.
  const t36 = suggestTrays({ name: 'Tomato' }, 36);
  assert.deepEqual([t36.tray, t36.potTray], [77, 40]);
  assert.match(t36.sowReason, /77 needs the fewest trays/);
  assert.equal(suggestTrays({ name: 'Tomato' }, 100).tray, 104);
  assert.equal(suggestTrays({ name: 'Tomato' }, 100).potTray, 40);
  assert.equal(suggestTrays({ name: 'Tomato' }, 12).potTray, 15);
  const z = suggestTrays({ name: 'Zucchini' }, 10);
  assert.deepEqual([z.tray, z.potTray], [24, null]);
  assert.equal(suggestTrays({ name: 'Lettuce' }, 60).tray, 60);
  const b = planBatch({ crop: { name: 'Tomato' }, zoneId: 'n', plants: 10, plantOutDate: '2027-05-20', id: 'x', today: '2027-03-01', tray: 60 }).batch;
  assert.equal(b.tray, 60);
  assert.equal(b.potTray, 15);
  assert.equal(planBatch({ crop: { name: 'Lettuce' }, zoneId: 'n', plants: 10, plantOutDate: '2027-05-20', id: 'x', today: '2027-03-01' }).batch.potTray, null);
});
import { scheduleOf as sched, stagesOf as stagesFor, earliestPlantOut } from '../src/features/nursery/nursery-model.js';
test('Seedling steps are always in order and planting out waits for the plants', () => {
  const cases = [
    { sowDate: '2026-09-26', plantOutDate: '2026-09-27', germDays: 7, potOn: true, weeks: 7, stageDates: {} },
    { sowDate: '2027-03-27', plantOutDate: '2027-05-15', germDays: 7, potOn: true, weeks: 7, stageDates: {} },
    { sowDate: '2027-03-27', plantOutDate: '2027-04-20', germDays: 7, potOn: true, weeks: 7, stageDates: { sown: '2027-03-27', sprouted: '2027-04-15' } },
    { sowDate: '2027-03-01', plantOutDate: '2027-03-05', germDays: 5, potOn: false, weeks: 4, stageDates: {} },
  ];
  for (const b of cases) {
    const s = sched(b), order = stagesFor(b).map((k) => s[k]);
    for (let i = 1; i < order.length; i++) assert(order[i] > order[i - 1], JSON.stringify(s));
  }
  const s = sched(cases[0]);
  assert.equal(s.delayedFrom, '2026-09-27');
  assert.equal(s.planted, '2026-10-27');
  assert.equal(sched(cases[1]).delayedFrom, null);
  assert.equal(earliestPlantOut({ germDays: 7, potOn: true }, '2026-09-26'), '2026-10-27');
});

import { PROPAGATION as PROP } from '../src/data/propagation.js';
import { trayOf as trayFor, potTrayFor } from '../src/data/trays.js';
test('Pot-on trays always have clearly bigger cells than the sowing tray', () => {
  for (const name of Object.keys(PROP)) {
    for (const n of [5, 12, 36, 60, 120, 300]) {
      const s = suggestTrays({ name }, n);
      if (!s.potTray) continue;
      assert(trayFor(s.potTray).cellCM >= trayFor(s.tray).cellCM * 1.3, `${name} ${n}: ${s.tray} -> ${s.potTray}`);
    }
  }
  // A chosen pot tray no bigger than the sowing tray is replaced by the suggestion.
  assert.equal(potTrayFor(60, 60, { name: 'Tomato' }, 36), suggestTrays({ name: 'Tomato' }, 36, 60).potTray);
  assert(trayFor(potTrayFor(60, 60, { name: 'Tomato' }, 36)).cellCM > trayFor(60).cellCM);
  assert.equal(potTrayFor(24, 104, { name: 'Tomato' }, 36), 24);
});

import {tasksByZone,taskAction,rewardText} from '../src/features/grove/zone-tasks.js';
test('Dairy groups get a daily milking task that fills the pantry, unless switched off', () => {
  const goats={...fixture,livestock:{animals:[...(fixture.livestock?.animals||[]),{id:'g1',type:'Goat',count:2}]}};
  const milk=buildTaskQueue(goats).find(t=>t.type==='milk');
  assert(milk&&milk.speciesType==='Goat');
  assert.equal(milk.expected,5);
  const next=applyTaskCompletion(goats,milk,4.5);
  const item=next.pantry.items.at(-1);
  assert.equal(item.qty,4.5);assert.equal(item.unit,'L');assert.equal(item.category,'Dairy');
  assert(!buildTaskQueue(next).some(t=>t.type==='milk'));
  const dry={...goats,livestock:{animals:goats.livestock.animals.map(a=>a.type==='Goat'?{...a,milking:false}:a)}};
  assert(!buildTaskQueue(dry).some(t=>t.type==='milk'));
  const sheep={...fixture,livestock:{animals:[{id:'s1',type:'Sheep',count:3}]}};
  assert(!buildTaskQueue(sheep).some(t=>t.type==='milk'));
});
test('Map badges group today’s jobs by the area where they happen', () => {
  const tasks=[{key:'a',plotId:'tom',daysOut:0,type:'water',pri:2},{key:'b',type:'eggs',speciesType:'Chicken',daysOut:0,pri:1},{key:'c',type:'upcoming',plotId:'tom',daysOut:2},{key:'d',type:'seedling',zoneId:'coop',daysOut:0,pri:1}];
  const by=tasksByZone(tasks,fixture);
  const tomZone=fixture.garden.plots.find(p=>p.id==='tom').zone;
  assert.deepEqual(by[tomZone].map(t=>t.key),['a']);
  assert.deepEqual(by.coop.map(t=>t.key).sort(),['b','d']);
  const eggs=taskAction({type:'eggs',speciesType:'Chicken',headCount:10},fixture);
  assert.equal(eggs.verb,'Collect');assert.equal(eggs.amount.value,7);
  assert.equal(rewardText({},eggs,'9'),'+9 🥚');
  assert.equal(taskAction({type:'feed'},fixture).cheer,'Fed!');
});

import {isRecurringCrop,nextHarvestDate,migratePerennials} from '../src/lib/perennial.js';
import {CROP_MAP} from '../src/data/crops.js';
test('Fruit trees and perennials stay planted after harvest and come back next season', () => {
  const fig=CROP_MAP.get('Fig');
  assert(isRecurringCrop(fig));assert(!isRecurringCrop(CROP_MAP.get('Tomato')));
  assert.equal(nextHarvestDate(fig,'2026-09-26'),'2027-08-01');
  assert.equal(nextHarvestDate(fig,'2026-03-01'),'2026-08-01');
  const data={...fixture,zones:[...fixture.zones,{id:'orch',type:'orchard',name:'Orchard',xM:1,yM:11,wM:6,hM:3}],garden:{plots:[...fixture.garden.plots,{id:'fig',crop:'Fig',zone:'orch',status:'planted',plantDate:'2025-01-01',harvestDate:'2026-08-01',plantCount:3,steps:[{done:false}]}]}};
  const next=applyTaskCompletion(data,{key:'plot-fig-harvest',type:'harvest',plotId:'fig'},40);
  const tree=next.garden.plots.find(p=>p.id==='fig');
  assert.equal(tree.status,'planted');assert(tree.harvestDate>todayLocalKey());assert.equal(tree.harvests,1);
  assert.equal(next.pantry.items.at(-1).qty,40);
  assert(!buildTaskQueue(next).some(t=>t.plotId==='fig'&&t.type==='harvest'));
  assert(growthOf(tree,fig,todayLocalKey()).index>=3);
  const lost={...data,garden:{plots:data.garden.plots.map(p=>p.id==='fig'?{...p,status:'harvested'}:p)}};
  assert.equal(migratePerennials(lost,CROP_MAP,'2026-09-26').garden.plots.find(p=>p.id==='fig').status,'planted');
  const tom={...data,garden:{plots:data.garden.plots.map(p=>p.id==='tom'?{...p,status:'harvested'}:p)}};
  assert.equal(migratePerennials(tom,CROP_MAP,'2026-09-26').garden.plots.find(p=>p.id==='tom').status,'harvested');
});

import {addStock,takeStock,sellStock,undoSale,markPaid,stockLines,stockValue,unpaidTotal,migratePantry,normalizeUnit} from '../src/lib/inventory.js';
test('Pantry works as farm inventory: stock in, FIFO out, sales become income', () => {
  let d={...fixture,pantry:{items:[]},costs:{items:[]}};
  d=addStock(d,{name:'Chicken Eggs',category:'Eggs',qty:12,unit:'eggs'},'2026-09-20');
  d=addStock(d,{name:'Chicken Eggs',category:'Eggs',qty:10,unit:'pcs'},'2026-09-25');
  const [line]=stockLines(d.pantry.items);
  assert.equal(line.qty,22);assert.equal(line.unit,'pcs');assert.equal(line.lots.length,2);
  d=sellStock(d,{key:line.key,qty:15,price:0.3,buyer:'Market',paid:false,today:'2026-09-26'});
  assert.deepEqual(d.pantry.items.map(i=>i.qty),[7]);
  assert.equal(d.pantry.items[0].addedDate,'2026-09-25');
  const sale=d.costs.items.at(-1);
  assert.equal(sale.type,'income');assert.equal(sale.amount,4.5);assert.equal(sale.paid,false);
  assert.equal(unpaidTotal(d),4.5);assert.equal(stockValue(d),2.1);
  assert.equal(d.pantry.prices[line.key],0.3);assert.deepEqual(d.pantry.buyers,['Market']);
  assert.equal(unpaidTotal(markPaid(d,sale.id)),0);
  const back=undoSale(d,sale.id,'2026-09-26');
  assert.equal(stockLines(back.pantry.items)[0].qty,22);assert(!back.costs.items.some(c=>c.id===sale.id));
  const used=takeStock(d,{key:line.key,qty:100,kind:'waste',today:'2026-09-26'});
  assert.equal(used.pantry.items.length,0);assert.equal(used.pantry.moves.at(-1).qty,-7);
  assert.deepEqual(normalizeUnit('lbs',10),{unit:'kg',qty:4.536});
  const old=migratePantry({...fixture,pantry:{items:[{id:'a',name:'Eggs',category:'Eggs',qty:20,unit:'count'},{id:'b',name:'Goat Milk',category:'Dairy',qty:5,unit:'kg'}]}});
  assert.deepEqual(old.pantry.items.map(i=>`${i.name} ${i.qty} ${i.unit}`),['Chicken Eggs 20 pcs','Goat Milk 5 L']);
});

import {snapPoint,addDraftPoint,lineLength} from '../src/features/grove/path-draw.js';
test('Drawing your own paths: straightens, joins existing corners, finishes on the last point', () => {
  assert.deepEqual(snapPoint({xM:2,yM:5},{xM:10,yM:5.8},20,20),{xM:10,yM:5});
  assert.deepEqual(snapPoint({xM:2,yM:5},{xM:2.6,yM:12},20,20),{xM:2,yM:12});
  assert.deepEqual(snapPoint(null,{xM:30,yM:-2},20,20),{xM:20,yM:0});
  assert.deepEqual(snapPoint({xM:0,yM:0},{xM:7.3,yM:9.2},20,20,[{xM:7,yM:9}]),{xM:7,yM:9});
  let d={kind:'path',points:[]};
  d=addDraftPoint(d,{xM:1,yM:1},20,20,[]);d=addDraftPoint(d,{xM:9,yM:1.4},20,20,[]);
  assert.deepEqual(d.points,[{xM:1,yM:1},{xM:9,yM:1}]);
  assert.equal(lineLength(d.points),8);
  assert.equal(addDraftPoint(d,{xM:9.1,yM:1.1},20,20,[]).finish,true);
});

import {snapZone,snapTo} from '../src/features/grove/path-draw.js';
test('Snapping: paths land on the grid with square corners; zones snap to grid or neighbour edges', () => {
  assert.deepEqual(snapPoint(null,{xM:3.3,yM:4.8},20,20,[],{grid:1}),{xM:3,yM:5});
  assert.deepEqual(snapPoint({xM:3,yM:5},{xM:9.2,yM:7.1},20,20,[],{grid:1}),{xM:9,yM:5});
  assert.deepEqual(snapPoint({xM:3,yM:5},{xM:4.1,yM:11.6},20,20,[],{grid:1}),{xM:3,yM:12});
  assert.equal(snapTo(7.26,0.5,20),7.5);
  const g=snapZone({xM:3.2,yM:4.9,wM:2,hM:1},[],1,20,20);assert.equal(g.xM,3);assert.equal(g.yM,5);
  const n=snapZone({xM:5.3,yM:2,wM:2,hM:1},[{xM:1,yM:2,wM:4.2,hM:1}],1,20,20);assert.equal(n.xM,5.2);
  const r=snapZone({xM:2,yM:2,wM:2.7,hM:0.2},[],1,20,20,true);assert.equal(r.wM,3);assert.equal(r.hM,1);
});

import {orderRoute} from '../src/features/quiet/walk-model.js';
test('Walk route: beds are swept in order, never skipped and returned to, and areas are not revisited', () => {
  // Six narrow beds side by side (each its own area), a coop to the right; entrance bottom middle.
  const beds=Array.from({length:6},(_,i)=>({id:`b${i+1}`,type:'veg',name:String(i+1),xM:2+i*1.2,yM:2,wM:0.8,hM:8,rowCount:1}));
  const zones=[...beds,{id:'coop',type:'barn',name:'Coop',xM:16,yM:2,wM:3,hM:2}];
  const route=planRound([],{...fixture,farmW:20,farmH:14,zones,garden:{plots:[]},livestock:{animals:[]}},'full');
  const ids=route.map(s=>s.zoneId);
  const bedOrder=ids.filter(id=>id.startsWith('b'));
  const asc=['b1','b2','b3','b4','b5','b6'];
  assert(JSON.stringify(bedOrder)===JSON.stringify(asc)||JSON.stringify(bedOrder)===JSON.stringify([...asc].reverse()),bedOrder.join());
  // contiguous: once you leave the beds you don't come back
  const first=ids.findIndex(id=>id.startsWith('b')),lastI=ids.length-1-[...ids].reverse().findIndex(id=>id.startsWith('b'));
  assert.equal(lastI-first,5);
  // Rows inside one area are swept in order, starting from the end nearer to where you arrive.
  const rows=[5,1,3,2,4].map(n=>({id:`p${n}`,zoneId:'bed',plotId:`p${n}`,xM:n,yM:5}));
  assert.deepEqual(orderRoute(rows,0,5).map(s=>s.id),['p1','p2','p3','p4','p5']);
  assert.deepEqual(orderRoute(rows,9,5).map(s=>s.id),['p5','p4','p3','p2','p1']);
});

/* ── UX pass 2026-09-28: honest first plan, sowing clock, plans, money, auth copy ── */
import {sowTiming,suggestCrops,describeSuggestion,buildStarterZone,starterKit,buildSevenDayPlan,starterCount} from '../src/lib/suggest.js';
import {isAwaitingSowing,firstStepIdx,toggleStep,startGrowing,waitingLabel,nextStepAfter} from '../src/lib/sowing.js';
import {planLabel} from '../src/services/payments/plan-label.js';
import {formatMoney,currencyCode} from '../src/lib/money.js';
import {initialAuthMode,friendlyAuthError} from '../src/lib/auth-messages.js';
import {spaceTitle} from '../src/lib/environment.js';
import {addDaysToLocalKey} from '../src/lib/utils.js';
const lateSep=new Date(2026,8,27),midSep=new Date(2026,8,5);
test('Sowing windows: open now, opening soon, or later — never months after they close',()=>{
  assert.equal(sowTiming(CROP_MAP.get('Radish'),'western_europe',lateSep).status,'now');
  assert.equal(sowTiming(CROP_MAP.get('Kale'),'western_europe',lateSep).status,'later'); // Apr-Jul
  assert.equal(sowTiming(CROP_MAP.get('Garlic'),'western_europe',lateSep).status,'soon'); // Oct-Nov, second half of Sep
  assert.equal(sowTiming(CROP_MAP.get('Garlic'),'western_europe',midSep).status,'later');
  assert.equal(sowTiming(CROP_MAP.get('Strawberry'),'western_europe',lateSep).verb,'Plant');
});
test('Late-September beginner suggestions are sowable now and exclude out-of-season kale',()=>{
  const profile={environment:'backyard',sunlight:'5to7',experience:'beginner',household:{dislikes:[]}};
  const list=suggestCrops(profile,'western_europe',{limit:9,date:lateSep});
  assert(list.length>=3);
  assert(!list.some(c=>c.name==='Kale'));
  const now=list.filter(c=>describeSuggestion(c,profile,'western_europe',lateSep).now);
  assert(now.length>=3,'at least three crops are sowable now');
  const d=describeSuggestion(CROP_MAP.get('Radish'),profile,'western_europe',lateSep);
  assert.equal(d.when,'Sow now');assert.equal(d.effort,'Easy');assert.match(d.ready,/weeks/);
});
test('Starter bed is sized by time, 1.2 m wide, and never exceeds the space',()=>{
  const b=buildStarterZone('backyard',8,5,'min15');
  assert.equal(b.hM,1.2);assert.equal(b.wM,2);assert.equal(b.areaM2,2.4);
  const big=buildStarterZone('backyard',8,5,'unlimited');assert(big.areaM2>b.areaM2&&big.areaM2<=8*5*0.8);
  const bal=buildStarterZone('balcony',4,1.5,'min5');assert.equal(bal.hM,.45);assert(bal.wM<=4-0.5);
  const tiny=buildStarterZone('balcony',1,1,'unlimited');assert(tiny.areaM2<=1);
  assert(starterCount(CROP_MAP.get('Radish'),2)>starterCount(CROP_MAP.get('Lettuce'),2));
});
test('Starter kit lists only what is missing; the first week starts with it',()=>{
  const zone={wM:2,hM:1.2,areaM2:2.4};
  const none=starterKit({environment:'backyard',assets:['none'],zone,picks:[{name:'Radish',count:24,verb:'Sow'},{name:'Strawberry',count:6,verb:'Plant'}]});
  const ids=none.map(i=>i.id);
  assert(ids.includes('bed')&&ids.includes('compost')&&ids.includes('tools')&&ids.includes('crop-Radish'));
  assert.match(none.find(i=>i.id==='crop-Strawberry').label,/plants/);
  const owned=starterKit({environment:'backyard',assets:['raised_bed','tools'],zone,picks:[]}).map(i=>i.id);
  assert(!owned.includes('bed')&&!owned.includes('tools'));
  const plan=buildSevenDayPlan(['Radish'],'western_europe',{kit:none});
  assert.match(plan[0].items[0],/starter kit/i);assert.match(plan[1].items[0],/sow/i);
});
const today=todayLocalKey();
const pending=(extra={})=>({id:'r',crop:'Radish',name:'Radish',zone:'bed2',status:'planted',plantDate:addDaysToLocalKey(today,-10),harvestDate:addDaysToLocalKey(today,18),sowPending:true,plantCount:20,steps:CROP_MAP.get('Radish').steps.map(s=>({...s,done:false})),...extra});
test('A planting waiting to be sown keeps only its sow job, even after the 3-day window',()=>{
  const data={...fixture,garden:{plots:[pending()]}};
  const q=buildTaskQueue(data).filter(t=>t.plotId==='r');
  assert.equal(q.length,1);assert.equal(q[0].title,'Radish: Sow');assert.equal(q[0].sowing,true);
  assert(!q.some(t=>t.type==='water'||t.type==='harvest'));
  const g=growthOf(pending(),CROP_MAP.get('Radish'),today);assert.equal(g.index,0);assert.equal(g.label,'Ready to sow');
});
test('Doing the sow job starts the clock today and keeps the growing time',()=>{
  const data={...fixture,garden:{plots:[pending()]}};
  const task=buildTaskQueue(data).find(t=>t.plotId==='r');
  const next=applyTaskCompletion(data,task,null);
  const p=next.garden.plots[0];
  assert.equal(p.plantDate,today);assert.equal(p.harvestDate,addDaysToLocalKey(today,28));
  assert.equal(p.sowPending,undefined);assert.equal(p.steps[0].done,true);
  assert.match(next.log.at(-1).text,/Sowed Radish/);
  assert(!isAwaitingSowing(p));
  assert.deepEqual(nextStepAfter(p,today),{label:'Thin',inDays:14});
});
test('Plans for a later month wait silently, then ask when the month comes',()=>{
  const later={...pending(),status:'planned',plantDate:'',harvestDate:'',sowPending:undefined,sowFrom:'2099-02'};
  assert.equal(buildTaskQueue({...fixture,garden:{plots:[later]}}).filter(t=>t.plotId==='r').length,0);
  assert.equal(waitingLabel(later,today),'Sow from Feb');
  const due={...later,sowFrom:today.slice(0,7)};
  assert.equal(buildTaskQueue({...fixture,garden:{plots:[due]}}).filter(t=>t.plotId==='r').length,1);
  const started=startGrowing(due,today,28);assert.equal(started.status,'planted');assert.equal(started.harvestDate,addDaysToLocalKey(today,28));
});
test('Toggling a later step never re-anchors; prep steps come before the sow step',()=>{
  assert.equal(firstStepIdx([{d:-7,l:'Chit'},{d:0,l:'Plant'},{d:30,l:'Earth up'}]),1);
  const p=pending();const t=toggleStep(p,1,today,28);assert.equal(t.plantDate,p.plantDate);assert.equal(t.steps[1].done,true);
});
test('Plan label tells the truth about trials and plans',()=>{
  assert.equal(planLabel({state:'trial',trialDaysLeft:6}),'Pro trial · 6 days left');
  assert.equal(planLabel({state:'trial',trialDaysLeft:1}),'Pro trial · last day');
  assert.equal(planLabel({state:'trial_expired'}),'Trial ended · read-only');
  assert.equal(planLabel({state:'active',plan:'basic'}),'Basic plan');
  assert.equal(planLabel({state:'active',plan:'pro'}),'Pro plan');
  assert.equal(planLabel({state:'lifetime'}),'Lifetime Pro');
  assert.equal(planLabel({state:'unknown'}),'');
});
test('Money uses the chosen currency; auth copy opens sign-up from Start free',()=>{
  assert.equal(currencyCode({currency:'GBP'}),'GBP');assert.equal(formatMoney(12.5,{currency:'GBP'}),'£12.50');
  assert.equal(formatMoney(3,{currency:'SEK'},0),'kr 3');
  assert.equal(initialAuthMode('?signup'),'signup');assert.equal(initialAuthMode(''),'signin');assert.equal(initialAuthMode('?mode=forgot'),'forgot');
  assert.match(friendlyAuthError('Invalid login credentials','signin'),/don't match/);
  assert.match(friendlyAuthError('User already registered','signup'),/Sign in instead/);
  assert.equal(spaceTitle({profile:{environment:'balcony'}}),'My balcony');assert.equal(spaceTitle({farmName:' Plot 9 ',profile:{environment:'farm'}}),'Plot 9');
});
import {parseBackup,farmSummary,describeSummary} from '../src/lib/backup.js';
test('Backup import checks the file first and describes what it would restore',()=>{
  assert.throws(()=>parseBackup('not json'),/isn't a MyTerra backup/);
  assert.throws(()=>parseBackup('[1,2]'),/isn't a MyTerra backup/);
  assert.throws(()=>parseBackup('{"name":"x"}'),/isn't a MyTerra backup/);
  assert.throws(()=>parseBackup('{"__proto__":{"a":1},"zones":[]}'),/reserved keys/);
  const text=JSON.stringify({zones:[{id:'a'},{id:'b'}],garden:{plots:[{id:'p',status:'planted'},{id:'q',status:'harvested'}]},livestock:{animals:[{id:'h'}]}});
  const res=parseBackup(text,d=>({...d,migrated:true}));
  assert.equal(res.data.migrated,true);
  assert.deepEqual(res.summary,{areas:2,plantings:1,animals:1,pantry:0});
  assert.equal(describeSummary(res.summary),'2 areas · 1 planting · 1 animal');
  assert.equal(describeSummary(farmSummary({})),'0 areas · 0 plantings');
});
import {signInMethods,deleteAccountError} from '../src/lib/auth-messages.js';
test('Account settings know how a person signs in and explain a failed deletion',()=>{
  assert.deepEqual(signInMethods({identities:[{provider:'email'}]}),{password:true,google:false});
  assert.deepEqual(signInMethods({identities:[{provider:'google'}],app_metadata:{provider:'google',providers:['google']}}),{password:false,google:true});
  assert.deepEqual(signInMethods({app_metadata:{providers:['email','google']}}),{password:true,google:true});
  assert.equal(signInMethods(null).password,true);
  assert.match(deleteAccountError({ok:false,code:'subscription_active',status:409}).text,/nothing was deleted/);
  assert.equal(deleteAccountError({ok:false,code:'subscription_active'}).contact,true);
  assert.equal(deleteAccountError({ok:false,status:401}).contact,false);
  assert.match(deleteAccountError({ok:false}).text,/couldn't delete/);
  assert.match(friendlyAuthError('New password should be different from the old password.','reset'),/current password/);
});
import {waitingPlantings,sowNowSuggestions,comingUp,seasonTimeline} from '../src/lib/plan.js';
import {produceTotals,moneyTotals,badgeList,nextHarvest,plantingCounts} from '../src/lib/progress.js';
import {sectionOf,normalizePage,SECTIONS} from '../src/app/navigation.js';
test('Five areas hold every page; old saved pages still open',()=>{
  assert.deepEqual(SECTIONS.map(s=>s.l),['Today','My Space','Plan','Learn','Progress']);
  assert.equal(sectionOf('tasks').id,'today');assert.equal(sectionOf('live').id,'space');assert.equal(sectionOf('fin').id,'progress');
  assert.equal(sectionOf('feedback'),null);assert.equal(sectionOf('nonsense').id,'today');
  assert.equal(normalizePage('farm'),'map');assert.equal(normalizePage('season'),'plan');assert.equal(normalizePage('setup'),'home');assert.equal(normalizePage('bogus'),'home');assert.equal(normalizePage('pantry'),'pantry');
});
test('Plan lists waiting plantings, fresh suggestions and a season strip',()=>{
  const data={region:'western_europe',profile:{environment:'backyard',experience:'beginner'},zones:[{id:'b',name:'Bed',type:'raised'}],garden:{plots:[
    {id:'w1',crop:'Radish',zone:'b',status:'planted',sowPending:true,plantDate:'2026-09-28',harvestDate:'2026-10-26',steps:[{d:0,l:'Sow',done:false}]},
    {id:'w2',crop:'Garlic',zone:'b',status:'planned',sowFrom:'2026-11',steps:[{d:0,l:'Plant cloves',done:false}]},
    {id:'g1',crop:'Lettuce',zone:'b',status:'planted',plantDate:'2026-08-01',harvestDate:'2026-10-10',steps:[]},
  ]}};
  const w=waitingPlantings(data,'2026-09-28');assert.deepEqual(w.map(x=>[x.plot.id,x.open]),[['w1',true],['w2',false]]);assert.equal(w[1].label,'Plant from Nov');
  const now=sowNowSuggestions(data,new Date(2026,8,28),6);assert(now.length>0);assert(!now.some(s=>['Radish','Garlic','Lettuce'].includes(s.crop.name)));assert(now.every(s=>s.info.now&&s.info.reason));
  const later=comingUp(data,new Date(2026,8,28),3);later.forEach(m=>m.crops.forEach(c=>assert(!now.some(s=>s.crop.name===c.name))));
  const tl=seasonTimeline(data,'2026-09-28',6);assert.equal(tl.months[0].label,'Sep');assert.equal(tl.rows.length,3);
  const lettuce=tl.rows.find(r=>r.crop==='Lettuce');assert.equal(lettuce.from,0);assert(lettuce.to>0.1&&lettuce.to<0.25);assert(tl.today>0.1&&tl.today<0.2);
  assert.equal(tl.rows.filter(r=>r.waiting).length,2);
});
test('Progress counts real harvests, money and badges without inventing numbers',()=>{
  const data={pantry:{items:[],moves:[{date:'2026-08-10',name:'Courgette',unit:'kg',qty:4,kind:'in',source:'farm'},{date:'2026-09-05',name:'Tomato',unit:'kg',qty:2,kind:'in',source:'farm'},{date:'2026-09-06',name:'Tomato',unit:'kg',qty:1,kind:'use'},{date:'2026-09-20',name:'Chicken Eggs',unit:'pcs',qty:12,kind:'in',source:'livestock'},{date:'2026-09-21',name:'Seeds',unit:'pcs',qty:5,kind:'in',source:'bought'}]},
    costs:{items:[{type:'expense',amount:30},{type:'income',amount:12.5}]},gamify:{badges:[{id:'first_harvest',unlockedAt:'2026-08-10'}]},
    garden:{plots:[{id:'a',crop:'Basil',status:'planted',plantDate:'2026-09-01',harvestDate:'2026-10-20'},{id:'b',crop:'Kale',status:'planted',plantDate:'2026-07-01',harvestDate:'2026-09-20'},{id:'c',crop:'Radish',status:'planted',sowPending:true,steps:[{d:0,l:'Sow',done:false}]}]}};
  const f=produceTotals(data,'2026-09-28',6);assert.equal(f.kg,6);assert.equal(f.harvests,2);assert.equal(f.eggs,12);assert.equal(f.portions,75);assert.equal(f.byMonth.length,6);assert.equal(f.byMonth[5].kg,2);assert.equal(f.byMonth[4].kg,4);
  assert.deepEqual(moneyTotals(data),{spent:30,earned:12.5,net:-17.5,entries:2});
  const b=badgeList(data);assert.equal(b[0].id,'first_harvest');assert.equal(b[0].earned,true);assert(b.slice(1).every(x=>!x.earned));
  assert.equal(nextHarvest(data,'2026-09-28').crop,'Kale');
  assert.deepEqual(plantingCounts(data,'2026-09-28'),{growing:2,waiting:1,ready:1});
  assert.equal(produceTotals({},'2026-09-28').kg,0);
});
