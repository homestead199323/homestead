import {memo} from 'react';
import {srand} from './sceneMath';
import {art,cropArtwork} from '../quiet/art';
import {roofBays,buildingScale} from './aerial-layout';

const leaves=Array.from({length:28},(_,i)=>({x:Math.cos(i*2.4)*Math.sqrt((i+.5)/28)*.88,y:Math.sin(i*2.4)*Math.sqrt((i+.5)/28)*.82,r:.18+srand(i)*.2}));
export const AerialDefs=memo(function AerialDefs({id}) {
  const url=n=>`url(#${id}-${n})`;
  return <defs>
    <linearGradient id={`${id}-roof`} x2=".75" y2="1"><stop stopColor="#85918b"/><stop offset=".5" stopColor="#687874"/><stop offset="1" stopColor="#495c58"/></linearGradient>
    <linearGradient id={`${id}-clay`} x2=".8" y2="1"><stop stopColor="#b99b78"/><stop offset="1" stopColor="#806348"/></linearGradient>
    <linearGradient id={`${id}-glass`} x2=".8" y2="1"><stop stopColor="#e9f3ec" stopOpacity=".6"/><stop offset=".48" stopColor="#aecbb9" stopOpacity=".12"/><stop offset="1" stopColor="#dbeee7" stopOpacity=".68"/></linearGradient>
    <linearGradient id={`${id}-water`} x2=".4" y2="1"><stop stopColor="#7faaa3"/><stop offset=".55" stopColor="#507e80"/><stop offset="1" stopColor="#315b61"/></linearGradient>
    <radialGradient id={`${id}-leaf`} cx=".3" cy=".25" r=".8"><stop stopColor="#a7b85e"/><stop offset=".45" stopColor="#6e9341"/><stop offset="1" stopColor="#35592d"/></radialGradient>
    <radialGradient id={`${id}-lettuce`} cx=".25" cy=".25" r=".85"><stop stopColor="#b9ce6c"/><stop offset=".65" stopColor="#7ca540"/><stop offset="1" stopColor="#42642a"/></radialGradient>
    <radialGradient id={`${id}-tree`} cx=".25" cy=".22" r=".85"><stop stopColor="#93aa62"/><stop offset=".5" stopColor="#587940"/><stop offset="1" stopColor="#2f502c"/></radialGradient>
    <radialGradient id={`${id}-fur`} cx=".25" cy=".2" r=".9"><stop stopColor="#fff9e5"/><stop offset=".65" stopColor="#d8d2bb"/><stop offset="1" stopColor="#9f9d84"/></radialGradient>
    <filter id={`${id}-canopy-shadow`} x="-25%" y="-25%" width="150%" height="150%"><feColorMatrix type="matrix" values="0 0 0 0 .04  0 0 0 0 .08  0 0 0 0 .03  0 0 0 .48 0"/><feGaussianBlur stdDeviation=".07"/></filter>
    <filter id={`${id}-shadow`} x="-30%" y="-30%" width="170%" height="180%" colorInterpolationFilters="sRGB"><feDropShadow dx=".13" dy=".2" stdDeviation=".10" floodColor="#263627" floodOpacity=".32"/></filter>
    <filter id={`${id}-building-shadow`} x="-30%" y="-30%" width="175%" height="175%" colorInterpolationFilters="sRGB"><feDropShadow dx=".38" dy=".68" stdDeviation=".14" floodColor="#182c21" floodOpacity=".52"/></filter>
    <pattern id={`${id}-metal`} width="3.2" height="3.2" patternUnits="userSpaceOnUse"><image href={art('aerial-roof')} width="3.2" height="3.2"/></pattern>
    <pattern id={`${id}-meadow`} width="9" height="9" patternUnits="userSpaceOnUse"><image href={art('aerial-grass')} width="9" height="9"/></pattern>
    {['grass','soil','gravel','wood','stone'].map(name=><pattern key={name} id={`${id}-${name}`} width={name==='grass'?1.8:1.2} height={name==='grass'?1.8:1.2} patternUnits="userSpaceOnUse"><image href={art('texture-'+name)} width={name==='grass'?1.8:1.2} height={name==='grass'?1.8:1.2}/></pattern>)}
    <pattern id={`${id}-lawn`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-28)"><rect width="2" height="4" fill="#f4f2c7" opacity=".055"/></pattern>
    <symbol id={`${id}-seedling`} viewBox="-1 -1 2 2"><path d="M0 .4V-.2" stroke="#73934f" strokeWidth=".1"/>{[-1,1].map(t=><ellipse key={t} cx={t*.22} cy={-.09} rx=".33" ry=".17" fill={url('leaf')} transform={`rotate(${t*35} ${t*.22} -.09)`}/>)}</symbol>
    <symbol id={`${id}-leafy`} viewBox="-1 -1 2 2">{[0,1,2].map(r=><g key={r} transform={`rotate(${r*28}) scale(${1-r*.24})`}>{Array.from({length:7},(_,i)=><path key={i} d="M0 0C-.2-.1-.67-.31-.5-.65Q-.47-.9-.18-.89Q.1-1 .25-.68Q.49-.49 0 0" fill={url('lettuce')} stroke="#435d2a" strokeWidth=".018" transform={`rotate(${i*360/7})`}/>)}</g>)}<circle r=".09" fill="#c6d977"/></symbol>
    <symbol id={`${id}-herb`} viewBox="-1 -1 2 2">{Array.from({length:12},(_,i)=><g key={i} transform={`rotate(${i*137.5}) scale(${.48+(i%3)*.17})`}><path d="M0 .05Q-.64-.3-.22-.94Q.48-.66 0 .05" fill={url('leaf')} stroke="#b6c781" strokeWidth=".024"/><path d="M0 0L-.22-.82" stroke="#e2e7a5" strokeOpacity=".35" strokeWidth=".018"/></g>)}</symbol>
    <symbol id={`${id}-vine`} viewBox="-1 -1 2 2">{Array.from({length:9},(_,i)=><g key={i} transform={`rotate(${i*137.5}) scale(${.65+(i%2)*.2})`}><path d="M0 0L-.18-.21-.1-.3-.34-.42-.2-.48-.41-.61-.27-.73-.12-.62 0-.92 .1-.61 .29-.72 .25-.48 .41-.36 .18-.31 .22-.15Z" fill={url('leaf')} stroke="#28462a" strokeWidth=".016"/><path d="M0 0V-.76" stroke="#c1cd8e" strokeWidth=".018"/></g>)}</symbol>
    <symbol id={`${id}-carrot`} viewBox="-1 -1 2 2">{Array.from({length:10},(_,i)=><g key={i} transform={`rotate(${i*36})`}><path d="M0 0Q-.16-.45 0-.96" stroke="#669047" strokeWidth=".045" fill="none"/>{[.25,.4,.55,.7].map((v,j)=><path key={j} d={`M0 ${-v}l${-.23+j*.035} -.13M0 ${-v}l${.23-j*.035} -.12`} stroke={j%2?'#8ca64f':'#507b38'} strokeWidth=".055" fill="none"/>)}</g>)}</symbol>
    <symbol id={`${id}-onion`} viewBox="-1 -1 2 2">{Array.from({length:9},(_,i)=><path key={i} d="M0 .08Q-.38-.52-.1-.95Q.09-.32 0 .08" transform={`rotate(${i*137.5})`} fill={i%2?'#547b58':'#92ab76'} stroke="#b6bd8b" strokeWidth=".018"/>)}</symbol>
    <symbol id={`${id}-tree-crown`} viewBox="-1.3 -1.3 2.6 2.6"><ellipse cx=".14" cy=".2" rx="1.02" ry=".88" fill="#283e25" opacity=".22"/>{leaves.map((l,i)=><circle key={i} cx={l.x} cy={l.y} r={l.r} fill={url('tree')}/>)}{leaves.slice(0,15).map((l,i)=><path key={i} d={`M${l.x-.04} ${l.y}l.08-.04`} stroke="#c0cd8c" strokeWidth=".035" opacity=".4"/>)}</symbol>
  </defs>;
});

export function Canopy({x=0,y=0,r=1,id,fruit}) {return <g transform={`translate(${x} ${y})`}>
 <image href={art('aerial-canopy')} x={-r+r*.42} y={-r+r*.62} width={r*2} height={r*2} filter={`url(#${id}-canopy-shadow)`} preserveAspectRatio="xMidYMid meet"/>
 <image href={art('aerial-canopy')} x={-r} y={-r} width={r*2} height={r*2} preserveAspectRatio="xMidYMid meet"/>
 {fruit&&Array.from({length:6},(_,i)=><circle key={i} cx={Math.cos(i*2.4)*r*.6} cy={Math.sin(i*2.4)*r*.6} r={r*.035} fill={fruit==='lemon'?'#d4bf58':'#b75936'}/>)}
 <circle r={r*.025} fill={`url(#${id}-tree)`} opacity=".15"/>
 </g>;}
export const CropCrown=memo(function CropCrown({crop='',stage=3,x,y,size=.45,id,seed=0}) {
 const name=crop.toLowerCase();
 const tree=/apple|pear|peach|plum|cherry|citrus|lemon|orange|fig|olive|walnut|almond|avocado/.test(name);
 if(stage<2)return <g><ellipse cx={x} cy={y} rx={size*.12} ry={size*.08} fill="#b6a47d"/>{stage===0&&<circle cx={x} cy={y} r={size*.2} fill="none" stroke="#bdb08c" strokeWidth=".025" strokeDasharray=".04 .04"/>}</g>;
 if(tree)return <Canopy x={x} y={y} r={size*.48} id={id} fruit={stage>3?(/lemon|orange/.test(name)?'lemon':'apple'):null}/>;
 if(['Tomato','Carrot','Lettuce','Basil'].includes(crop)){
  const diameter=size*(stage===2?.52:stage===3?.8:1);
  return <g><ellipse cx={x+diameter*.15} cy={y+diameter*.2} rx={diameter*.4} ry={diameter*.35} fill="#102714" opacity=".32"/><image href={cropArtwork(crop,stage,'top')} x={x-diameter/2} y={y-diameter/2} width={diameter} height={diameter} preserveAspectRatio="xMidYMid meet"/></g>;
 }

 const family=stage===2?'seedling':/carrot|parsnip|fennel|dill/.test(name)?'carrot':/onion|leek|garlic|chive|corn|maize/.test(name)?'onion':/lettuce|cabbage|spinach|chard|kale|broccoli|cauliflower/.test(name)?'leafy':/tomato|pepper|eggplant|bean|pea|cucumber|pumpkin|squash|melon|strawberry/.test(name)?'vine':'herb';
 const r=size*(stage===2?.52:stage===3?.78:1);
 return <g transform={`translate(${x} ${y}) rotate(${srand(seed)*80})`}><ellipse cx={r*.09} cy={r*.15} rx={r*.44} ry={r*.38} fill="#172d16" opacity=".25"/><use href={`#${id}-${family}`} x={-r/2} y={-r/2} width={r} height={r}/>{stage>=4&&/tomato|pepper|strawberry|eggplant/.test(name)&&[0,1,2].map(i=><g key={i}><circle cx={Math.cos(i*2.1)*r*.24} cy={Math.sin(i*2.1)*r*.21} r={r*.09} fill={/eggplant/.test(name)?'#5b3c62':stage===4?'#95a650':'#c04e32'}/><circle cx={Math.cos(i*2.1)*r*.24-r*.025} cy={Math.sin(i*2.1)*r*.21-r*.025} r={r*.025} fill="#f5cd85" opacity=".65"/></g>)}</g>;
});

export function Fence({x=0,y=0,w,h,id,gate=false,pickets=false}) {
 const segments=[[[x,y],[x+w,y]],[[x,y],[x,y+h]],[[x+w,y],[x+w,y+h]],...(!gate?[[[x,y+h],[x+w,y+h]]]:[[[x,y+h],[x+w*.36,y+h]],[[x+w*.64,y+h],[x+w,y+h]]])];
 return <g strokeLinecap="square" filter={`url(#${id}-shadow)`}>{segments.map(([a,b],i)=><g key={i}><path d={`M${a}L${b}`} stroke="#6f6c52" strokeWidth=".13"/><path d={`M${a[0]-.025} ${a[1]-.025}L${b[0]-.025} ${b[1]-.025}`} stroke="#d6c9a6" strokeWidth=".045"/>{Array.from({length:Math.min(800,Math.max(2,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/(pickets?.24:1.2))+1))}).map((_,j,arr)=>{const t=j/(arr.length-1);const px=a[0]+(b[0]-a[0])*t,py=a[1]+(b[1]-a[1])*t;if(pickets)return <path key={j} d={`M${px-.065} ${py+.07}v-.17l.065-.09 .065 .09v.17Z`} fill="#b9996e" stroke="#66513a" strokeWidth=".025"/>;return <rect key={j} x={a[0]+(b[0]-a[0])*t-.09} y={a[1]+(b[1]-a[1])*t-.09} width=".18" height=".18" fill="#dbcfaf" stroke="#6a6853" strokeWidth=".025"/>;})}</g>)}</g>;
}

export function Roof({x=0,y=0,w,h,id,clay=false,hip=false}) {
 const ridge=Math.min(w*.18,h*.25), bays=roofBays(w);
 return <g filter={`url(#${id}-building-shadow)`}>
   <rect x={x-.08} y={y-.08} width={w+.16} height={h+.16} fill="#d7d4bb" stroke="#777c69" strokeWidth=".055"/>
   <rect x={x-.14} y={y-.13} width={w+.28} height={h+.22} fill={`url(#${id}-${clay?'clay':'roof'})`} stroke="#4b5b50" strokeWidth=".04"/>
   {!clay&&<rect x={x-.14} y={y-.13} width={w+.28} height={h+.22} fill={`url(#${id}-metal)`}/>}
   <path d={`M${x-.14} ${y-.13}H${x+w+.14}V${y+h/2}H${x-.14}Z`} fill="#e7eaf0" opacity=".12"/>
   <path d={`M${x-.14} ${y+h/2}L${x+w+.14} ${y+h/2}V${y+h+.1}H${x-.14}Z`} fill="#15212d" opacity=".36"/>
   {Array.from({length:bays},(_,i)=>{const xx=x+(i+.5)*w/bays;return <g key={i}><path d={`M${xx} ${y-.1}V${y+h+.08}`} stroke="#203e38" strokeOpacity=".26" strokeWidth=".022"/><path d={`M${xx-.024} ${y-.1}V${y+h+.08}`} stroke="#dce3c7" strokeOpacity=".25" strokeWidth=".017"/></g>;})}
   {hip&&<><path d={`M${x-.14} ${y-.13}L${x+ridge} ${y+h/2}L${x-.14} ${y+h+.1}Z`} fill="#b2bb9f" opacity=".22"/><path d={`M${x+w+.14} ${y-.13}L${x+w-ridge} ${y+h/2}L${x+w+.14} ${y+h+.1}Z`} fill="#0e302e" opacity=".27"/><path d={`M${x-.14} ${y-.13}L${x+ridge} ${y+h/2}L${x-.14} ${y+h+.1}M${x+w+.14} ${y-.13}L${x+w-ridge} ${y+h/2}L${x+w+.14} ${y+h+.1}`} stroke="#cad0b7" strokeWidth=".035" fill="none"/></>}
   <path d={`M${x+(hip?ridge:-.12)} ${y+h/2}H${x+w-(hip?ridge:-.12)}`} stroke="#3c554d" strokeWidth=".09"/>
   <path d={`M${x+(hip?ridge:-.12)} ${y+h/2-.035}H${x+w-(hip?ridge:-.12)}`} stroke="#b9c3ac" strokeWidth=".03"/>
   <path d={`M${x-.13} ${y+h+.08}H${x+w+.13}`} stroke="#c7cabb" strokeWidth=".065"/>
 </g>;
}

export function Building({type,w,h,id,clay,children}) {
 const glass=type==='greenhouse', barn=type==='barn'||type==='coop';
 if(glass)return <g>
   <rect width={w} height={h} fill={`url(#${id}-soil)`}/>
   <rect x={w*.45} width={w*.1} height={h} fill="#c8c7ab"/>
   {children}
   <g filter={`url(#${id}-building-shadow)`}>
    <rect x="-.06" y="-.06" width={w+.12} height={h+.12} fill={`url(#${id}-glass)`} stroke="#eff2df" strokeWidth=".09"/>
    <path d={`M${w*.5} 0V${h}`} stroke="#edf1e7" strokeWidth=".11"/>
    {Array.from({length:roofBays(h,1.1)+1}).map((_,i,a)=><g key={i}><path d={`M0 ${h*i/(a.length-1)}H${w}`} stroke="#6b8678" strokeWidth=".09"/><path d={`M0 ${h*i/(a.length-1)-.035}H${w}`} stroke="#edf1e6" strokeWidth=".035"/></g>)}
    {Array.from({length:roofBays(h,1.1)}).map((_,i,a)=><g key={i}>
      <path d={`M${w*.06} ${h*(i+.12)/a.length}H${w*.46}V${h*(i+.88)/a.length}H${w*.06}Z`} fill="#d6e4ea" opacity={i%3===0?.22:.09}/>
      <path d={`M${w*.55} ${h*(i+.08)/a.length}H${w*.96}V${h*(i+.85)/a.length}H${w*.55}Z`} fill="#f5f8fa" opacity={i%2?.23:.34}/>
      <path d={`M${w*.55} ${h*(i+.1)/a.length}H${w*.95}`} stroke="#f3f8f8" strokeWidth=".04"/>
    </g>)}

    <rect x={w*.37} y={h-.025} width={w*.26} height=".06" fill="#496a5e"/>
   </g>
 </g>;
 if(type==='beehive')return <g filter={`url(#${id}-building-shadow)`}><rect width={w} height={h} rx=".07" fill={`url(#${id}-gravel)`}/>{Array.from({length:Math.min(12,Math.max(1,Math.floor(w/.7)))}).map((_,i,a)=>{const bw=Math.min(.5,w*.7),bh=Math.min(.65,h*.7),xx=(i+.5)*w/a.length-bw/2,yy=h/2-bh/2;return <g key={i}><rect x={xx} y={yy} width={bw} height={bh} fill="#e1d6b2" stroke="#9c8e6a" strokeWidth=".035"/><rect x={xx+.02} y={yy+.02} width={bw-.04} height={bh*.87} fill="#d0d7ca" stroke="#eee9d6" strokeWidth=".025"/><path d={`M${xx} ${yy+bh-.04}h${bw}`} stroke="#b38e46" strokeWidth=".08"/><path d={`M${xx+.12} ${yy+bh+.07}h${Math.max(.08,bw-.24)}`} stroke="#695634" strokeWidth=".04"/></g>;})}</g>;
 if(type==='compost')return <g filter={`url(#${id}-shadow)`}><rect width={w} height={h} fill={`url(#${id}-soil)`} stroke="#9c8d66" strokeWidth=".12"/>{[1,2].map(i=><path key={i} d={`M${w*i/3} 0V${h}`} stroke="#b1a27c" strokeWidth=".1"/>)}{Array.from({length:28},(_,i)=><ellipse key={i} cx={srand(i)*w} cy={srand(i+37)*h} rx=".12" ry=".05" fill={['#57452e','#786246','#a79c65'][i%3]} transform={`rotate(${i*57} ${srand(i)*w} ${srand(i+37)*h})`}/>)}</g>;
 const dim=buildingScale(w,h,type),front=dim.front,roof=dim.roofDepth,door=dim.door;
 return <g>
  <rect width={w} height={h} fill={barn?'#b4a07a':'#d4d0bd'}/>
  {barn&&<rect y={roof} width={w} height={front} fill={`url(#${id}-gravel)`} opacity=".35"/>}
  <rect y={roof-.1} width={w} height={Math.min(.4,front)} fill={barn?'#978366':'#e4e1d2'}/>
  <rect x={(w-door)/2} y={roof-.02} width={door} height={Math.min(.32,front)} fill="#3e4237" stroke="#d8c4a0" strokeWidth=".06"/>
  {!barn&&Array.from({length:Math.max(0,Math.floor(w/3))},(_,i)=>{const x=(i+.5)*w/Math.floor(w/3);return Math.abs(x-w/2)>1?<rect key={i} x={x-dim.window/2} y={roof} width={dim.window} height={Math.min(.22,front*.65)} fill="#324b55" stroke="#efecdf" strokeWidth=".04"/>:null;})}
  {barn&&Array.from({length:Math.max(2,Math.ceil(w/3)+1)}).map((_,i,a)=><g key={i}><rect x={i*(w-.12)/(a.length-1)} y={roof-.05} width=".12" height={Math.min(.42,front)} fill="#cec2a1"/><path d={`M${i*(w-.12)/(a.length-1)} ${roof+.3}l.22 .3`} stroke="#263026" strokeWidth=".075" opacity=".4"/></g>)}
  <Roof w={w} h={roof} id={id} clay={clay||dim.small} hip={type==='house'}/>
  {type==='house'&&<g transform={`translate(${w*.72} ${Math.min(1,h*.2)})`} filter={`url(#${id}-shadow)`}><rect width=".38" height=".48" fill="#c4b795" stroke="#e9dfc3" strokeWidth=".055"/><rect x=".07" y=".07" width=".23" height=".26" fill="#566254"/></g>}
  {!barn&&<rect x={(w-Math.min(1.5,w*.7))/2} y={roof+.22} width={Math.min(1.5,w*.7)} height={Math.max(.05,front-.22)} fill="#d2c6a3" stroke="#e2d6b6" strokeWidth=".035"/>}
 </g>;
}

export function OverheadAnimal({species='Chicken',x,y,id,angle=0,size=1}) {
 const portrait={Cow:'aerial-cow',Goat:'aerial-goat',Sheep:'aerial-sheep',Chicken:'aerial-chicken'}[species];
 if(portrait){const length=species==='Cow'?2.05:species==='Chicken'?.62:1.18;return <g transform={`translate(${x} ${y}) scale(${size})`}><ellipse cx=".16" cy=".24" rx={length*.23} ry={length*.42} fill="#172718" opacity=".4"/><image href={art(portrait)} x={-length/2} y={-length/2} width={length} height={length} transform={`rotate(${angle})`} preserveAspectRatio="xMidYMid meet"/></g>;}
 const bird=['Chicken','Duck','Goose','Turkey','Quail','Guinea Fowl'].includes(species),bee=species==='Bee';
 const horse=['Horse','Donkey'].includes(species),cow=species==='Cow',pig=species==='Pig',rabbit=species==='Rabbit';
 const color=species==='Chicken'?'#b88144':species==='Guinea Fowl'?'#5b625c':pig?'#d9b4a2':horse?(species==='Donkey'?'#969486':'#946b45'):cow?'#f0eddb':`url(#${id}-fur)`;
 return <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${size})`}>
   <ellipse cx=".05" cy=".1" rx={bird?.16:.28} ry={bird?.26:.5} fill="#283926" opacity=".23"/>
   {bee?<><ellipse rx=".045" ry=".085" fill="#c9a95e"/><path d="M-.04-.02h.08M-.04.03h.08" stroke="#434d39" strokeWidth=".024"/><ellipse cx="-.055" cy="-.015" rx=".055" ry=".023" fill="#f2f1ce"/><ellipse cx=".055" cy="-.015" rx=".055" ry=".023" fill="#f2f1ce"/></>:<>
   {!bird&&[-1,1].map(side=><path key={side} d={`M${side*.2} -.22l${side*.075} -.1M${side*.2} .23l${side*.065} .09`} stroke={pig?'#ad9180':'#625d49'} strokeWidth=".055"/>)}
   <ellipse rx={bird?.15:rabbit?.18:.26} ry={bird?.24:rabbit?.29:horse?.52:.44} fill={color} stroke="#48533c" strokeWidth=".015"/>
   {cow&&<><path d="M-.2-.29Q.11-.42.13-.15T-.22-.06Z" fill="#4d5346"/><path d="M.04.18Q.34.14.2.36L.03.4Z" fill="#4d5346"/></>}
   {species==='Sheep'&&Array.from({length:10},(_,i)=><circle key={i} cx={Math.cos(i*2.4)*.17} cy={Math.sin(i*2.4)*.29} r=".1" fill={`url(#${id}-fur)`}/>)}
   <ellipse cy={bird?-.22:horse?-.58:-.4} rx={bird?.09:.11} ry={bird?.12:horse?.2:.15} fill={color} stroke="#59604a" strokeWidth=".015"/>
   {bird?<><path d="M-.04-.33L0-.41 .04-.33Z" fill="#d0ac55"/><path d="M-.09.14L0 .34 .09.14" fill={color} stroke="#765e3e" strokeWidth=".016"/>{species==='Chicken'&&<ellipse cx="-.02" cy="-.3" rx=".022" ry=".09" fill="#b9553e"/>}{species==='Guinea Fowl'&&Array.from({length:8},(_,i)=><circle key={i} cx={(srand(i)-.5)*.19} cy={(srand(i+19)-.5)*.3} r=".012" fill="#e0dcca"/>)}</>:<>
   {[-1,1].map(side=><ellipse key={side} cx={side*.105} cy={horse?-.67:rabbit?-.48:-.43} rx=".038" ry={horse||rabbit?.13:.065} fill={color} transform={`rotate(${side*30} ${side*.105} ${horse?-.67:rabbit?-.48:-.43})`}/>)}
   <path d={pig?'M0 .4q.16.12.09-.02':'M0 .4q.15.2.06.33'} fill="none" stroke={pig?'#bb9887':'#6c6850'} strokeWidth=".027"/>
   {horse&&<path d="M0-.45V.25" stroke="#574937" strokeWidth=".045"/>}
   </>}
   </>}
 </g>;
}

export function Ornament({o,id}) {
 const type=o.type;
 if(type==='tree')return <Canopy id={id} r={.8}/>;
 if(type==='bush'||type==='flowers')return <g><Canopy id={id} r={.45}/>{type==='flowers'&&Array.from({length:9},(_,i)=><circle key={i} cx={(srand(i)-.5)*.6} cy={(srand(i+10)-.5)*.6} r=".045" fill={i%2?'#eee4b4':'#b78386'}/>)}</g>;
 if(type==='pond')return <ellipse rx=".7" ry=".45" fill={`url(#${id}-water)`} stroke="#9c9e80" strokeWidth=".08"/>;
 if(type==='rock')return <path d="M-.3-.1L-.17-.3 .22-.25 .35.06 .1.27-.2.21Z" fill="#acaf9a" stroke="#e3dec8" strokeWidth=".025"/>;
 if(type==='shed')return <Roof x={-.55} y={-.45} w={1.1} h={.9} id={id}/>;
 if(type==='pot'||type==='planter'||type==='hangpot')return <g><circle r=".3" fill="#b8916d" stroke="#d5b18d" strokeWidth=".07"/><CropCrown x={0} y={0} crop="Basil" id={id} size={.5} stage={4}/></g>;
 if(type==='wateringcan')return <g fill="#698776" stroke="#365b4e" strokeWidth=".04"><circle r=".15"/><path d="M.1-.07l.3-.13-.2.26Z"/><ellipse cx="-.15" rx=".1" ry=".13" fill="none"/></g>;
 if(type==='haybale')return <g><rect x="-.4" y="-.24" width=".8" height=".48" rx=".12" fill="#bca568" stroke="#8e7d4e" strokeWidth=".04"/><path d="M-.2-.23v.46M.2-.23v.46" stroke="#7a7752" strokeWidth=".035"/></g>;
 if(type==='woodpile')return <g>{[0,1,2,3].map(i=><rect key={i} x="-.4" y={-.26+i*.14} width=".8" height=".12" rx=".05" fill={i%2?'#a89165':'#7d684b'} stroke="#c1aa83" strokeWidth=".02"/>)}</g>;
 return <g fill="#aa9671" stroke="#776b4e" strokeWidth=".025"><rect x="-.45" y="-.2" width=".9" height=".13"/><rect x="-.45" y="-.02" width=".9" height=".2"/><path d="M-.32-.2v.44M.32-.2v.44" strokeWidth=".07"/></g>;
}
