import {bedLength,bedRows,layoutPlots} from './farm-model';
const TREE_NAMES=new Set(['Apple','Pear','Olive','Fig','Peach','Plum','Cherry','Apricot','Walnut','Almond','Chestnut','Quince','Persimmon','Lemon','Orange','Hazelnut','Pomegranate','Avocado','Mango']);
export const isTreeCrop=c=>!!c&&(TREE_NAMES.has(c.name)||['Fruit Tree','Nut Tree'].includes(c.cat));
export function cropFitsZone(c,z){
 if(!c||!z)return false;
 if(z.type==='orchard')return ['Fruit','Fruit Tree','Nut Tree'].includes(c.cat);
 if(isTreeCrop(c))return z.type==='container';
 if(z.type==='herbs')return c.cat==='Herb';
 return ['veg','raised','greenhouse','container'].includes(z.type);
}
export function occupiedBands(zone,plots,excludeId){
 const cross=zone.rowAxis==='vertical'?zone.wM:zone.hM,gap=cross/bedRows(zone);
 return layoutPlots(zone,plots).filter(p=>p.id!==excludeId&&p.layout.pattern!=='scatter').map(p=>p.layout.version===2?
  [p.layout.startM,p.layout.startM+p.layout.spacingCM/100+(p.layout.rowCount-1)*p.layout.rowSpacingCM/100]:
  [(p.layout.startRow-1)*gap,(p.layout.startRow-1+p.layout.rowCount)*gap]).sort((a,b)=>a[0]-b[0]);
}
export function gridCapacity(length,spacing,pattern,row){
 return Math.max(0,Math.floor((length-.2-(pattern==='offset'&&row%2?spacing/2:0)+1e-8)/spacing));
}
export function planPlanting(zone,plots,input,crop,excludeId){
 const fail=error=>({error,count:0,rows:0});
 if(!cropFitsZone(crop,zone))return fail(zone?.type==='orchard'?'Choose a fruit or nut crop for an orchard.':'Choose a suitable growing area for this crop.');
 const spacingCM=Number(input.spacingCM??crop.spacing),spacing=spacingCM/100;
 const pattern=input.pattern||'rows',random=pattern==='scatter';
 const rowSpacingCM=Number(input.rowSpacingCM??Math.round(spacingCM*(pattern==='offset'?Math.sqrt(3)/2:1)*10)/10),rowGap=rowSpacingCM/100;
 if(!(spacing>0)||!Number.isFinite(spacing)||!(rowGap>0)||!Number.isFinite(rowGap))return fail('Enter positive plant and row spacing.');
 const byRows=input.mode==='rows'&&!random,value=Number(byRows?input.rowCount:input.plantCount);
 if(!Number.isInteger(value)||value<1)return fail(`Enter a whole number of ${byRows?'rows':'plants'} greater than zero.`);
 if(value>100000||byRows&&value>1000)return fail('Use a smaller planting group.');
 if(random){
  if(zone.type!=='orchard')return fail('Scattered planting is available in orchards.');
  const points=scatterTrees(zone,plots,value,spacing,excludeId,crop.name);
  if(points.length!==value)return fail(`Only ${points.length} additional trees fit at this spacing. Use fewer trees or reduce spacing.`);
  return {count:value,rows:0,error:'',layout:{version:2,pattern,spacingCM,rowSpacingCM,points}};
 }
 const length=Number(input.lengthM||bedLength(zone)),cross=zone.rowAxis==='vertical'?zone.wM:zone.hM;
 if(!(length>.2)||length>bedLength(zone))return fail(`Row length must fit within ${bedLength(zone)} m.`);
 const capacities=[];let count=0;
 while((byRows?capacities.length<value:count<value)&&capacities.length<1000){
  const capacity=gridCapacity(length,spacing,pattern,capacities.length);
  if(!capacity)return fail('The row is too short for this spacing and pattern.');
  capacities.push(capacity);count+=capacity;
 }
 if(!byRows&&count<value)return fail('This planting needs too many rows.');
 const rows=capacities.length,height=spacing+(rows-1)*rowGap;
 let start=.1;
 const bands=occupiedBands(zone,plots,excludeId);
 if(input.startM!==undefined&&input.startM!=='')start=Number(input.startM);
 else for(const [a,b] of bands){if(start+height<=a+.00001)break;if(start<b)start=b+.1;}
 if(!Number.isFinite(start)||start<.1||start+height>cross-.1+.00001)return {...fail(`${rows} rows need ${height.toFixed(2)} m of free bed width at this spacing. Reduce plants/rows or spacing, or expand the bed.`),rows,count:byRows?count:value};
 if(bands.some(([a,b])=>start<b-.00001&&start+height>a+.00001))return fail('This planting overlaps an existing crop. Choose free space.');
 if(!byRows)count=value;
 const layout={version:2,pattern,spacingCM,rowSpacingCM,startM:start,rowCount:rows,lengthM:length,mode:byRows?'rows':'plants'};
 if(zone.type==='orchard'){
  const existing=layoutPlots(zone,plots).filter(p=>p.id!==excludeId&&p.layout.pattern==='scatter').flatMap(p=>physicalPoints(zone,p).map(q=>({...q,spacing:(p.layout.spacingCM||spacingCM)/100})));
  if(existing.length&&physicalPoints(zone,{plantCount:count,layout}).some(q=>existing.some(p=>Math.hypot(q.xM-p.xM,q.yM-p.yM)<Math.max(spacing,p.spacing)-.00001)))return {...fail('These rows would overlap scattered trees. Change spacing or use a scattered arrangement.'),count,rows};
 }
 return {count,rows,error:'',height,layout};
}
// Stable, bounded best-candidate placement. Saved coordinates are never re-randomized on render.
export function scatterTrees(zone,plots,count,spacing,excludeId,seedText=''){
 const occupied=layoutPlots(zone,plots).filter(p=>p.id!==excludeId).flatMap(p=>{
  const points=p.layout?.points||physicalPoints(zone,p);
  return points.map(q=>({...q,spacing:(p.layout?.spacingCM||spacing*100)/100}));
 });
 let seed=[...zone.id+seedText].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,7);
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const margin=Math.max(.2,spacing/2),result=[];
 if(zone.wM<margin*2||zone.hM<margin*2)return result;
 for(let i=0;i<Math.min(40000,count*500)&&result.length<count;i++){
  const q={xM:margin+rand()*(zone.wM-margin*2),yM:margin+rand()*(zone.hM-margin*2)};
  if([...occupied,...result].every(p=>Math.hypot(q.xM-p.xM,q.yM-p.yM)>=Math.max(spacing,p.spacing||spacing)-.00001))result.push(q);
 }
 return result;
}
export function physicalPoints(zone,plot){
 if(plot.layout?.points)return plot.layout.points;
 const l=plot.layout||{},vertical=zone.rowAxis==='vertical',cross=vertical?zone.wM:zone.hM,along=bedLength(zone);
 const n=Math.max(0,Math.floor(plot.plantCount||0)),num=l.rowCount||1,points=[];
 let remaining=n;
 for(let row=0;row<num&&remaining>0;row++){
  const modern=l.version===2,spacing=(l.spacingCM||30)/100;
  const count=modern?Math.min(remaining,gridCapacity(l.lengthM||along,spacing,l.pattern,row)):Math.floor(n/num)+(row<n%num?1:0);
  const at=modern?l.startM+spacing/2+row*l.rowSpacingCM/100:((l.startRow||1)-1+row+.5)*cross/bedRows(zone);
  for(let col=0;col<count;col++){
   const pos=modern?.1+spacing/2+(col+(l.pattern==='offset'&&row%2?.5:0))*spacing:(col+.5)*(l.lengthM||along)/Math.max(1,count);
   points.push({xM:vertical?at:pos,yM:vertical?pos:at});
  }
  remaining-=count;
 }
 return points;
}
