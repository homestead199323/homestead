import test from 'node:test';
import assert from 'node:assert/strict';
import {access} from 'node:fs/promises';
import sharp from 'sharp';
import {fileURLToPath} from 'node:url';
import {LDB} from '../src/data/livestock.js';
import {CROP_MAP} from '../src/data/crops.js';
import {cropSlug, treeKey} from '../src/features/grove/crop-families.js';
// The app's small pictures are rendered from the 3D map's models (scripts/render-icons.mjs).
const dir=new URL('../src/assets/toy/',import.meta.url);
async function icon(name){
 const path=new URL(name+'.webp',dir);await access(path);
 const meta=await sharp(fileURLToPath(path)).metadata();
 assert(meta.hasAlpha,`${name} must have a transparent background`);
 assert(meta.width<=256&&meta.height<=256,`${name} should stay mobile sized`);
}
test('Every livestock species has a toy portrait (bees show their hive)',async()=>{
 for(const species of Object.keys(LDB))await icon(species==='Bee'?'zone-beehive':'animal-'+species.toLowerCase().replaceAll(' ','-'));
});
test('Every crop in the database has a toy icon for each visible growth stage',async()=>{
 for(const name of CROP_MAP.keys()){const t=treeKey(name);for(const st of [2,3,4,5])await icon(t?`tree-${t}-${st}`:`crop-${cropSlug(name)}-${st}`);}
 await icon('crop-planned');await icon('crop-sown');
});
test('Every building and area type has a toy tile',async()=>{
 for(const t of ['house','barn','coop','storage','greenhouse','beehive','compost','nursery','water','pasture','orchard','veg','raised','herbs','container'])await icon('zone-'+t);
});
