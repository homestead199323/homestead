import test from 'node:test';
import assert from 'node:assert/strict';
import {access} from 'node:fs/promises';
import sharp from 'sharp';
import {fileURLToPath} from 'node:url';
import {LDB} from '../src/data/livestock.js';
const assets=new URL('../src/assets/quiet/',import.meta.url);
test('Every supported animal species has a standalone transparent portrait',async()=>{
 for(const species of Object.keys(LDB)){
  const path=new URL(species.toLowerCase().replaceAll(' ','-')+'.webp',assets);
  await access(path);const meta=await sharp(fileURLToPath(path)).metadata();
  assert(meta.hasAlpha,`${species} must have transparent edges`);
  assert(meta.width<=480&&meta.height<=480,`${species} should remain mobile sized`);
 }
});
test('Primary crop stages use separate transparent images, including overhead views',async()=>{
 for(const crop of ['tomato','carrot','lettuce','basil'])for(const view of ['','-top'])for(const stage of [2,3,4,5]){
  const path=new URL(`${crop}${view}-${stage}.webp`,assets);
  const meta=await sharp(fileURLToPath(path)).metadata();
  assert(meta.hasAlpha,`${path} must be an isolated cutout`);
  assert(meta.width<=480&&meta.height<=480,'Portrait must not be an entire sprite atlas');
 }
});
test('Aerial subjects are separate transparent assets and terrain materials are bounded',async()=>{
 for(const name of ['canopy','cow','goat','sheep','chicken','roof','grass']){
  const meta=await sharp(fileURLToPath(new URL(`aerial-${name}.webp`,assets))).metadata();
  if(!['roof','grass'].includes(name))assert(meta.hasAlpha,`${name} must not have a rectangular background`);
  assert(meta.width<=768&&meta.height<=768);
 }
});
