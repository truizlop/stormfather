import * as T from 'three';
import {sailingBoat} from './maritime';
import {marketCourt} from './marketCourt';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import { ModelBuilder,random,palette,type V3,type PlaceModel,type Route } from './kit';
import {pointInPolygon,type GeographyPoint} from '../../world/cartography/geography';

type XY=readonly[number,number];
function distanceToSegment(x:number,z:number,a:V3,b:V3){const dx=b[0]-a[0],dz=b[2]-a[2];const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[2])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-a[0]-dx*t,z-a[2]-dz*t);}
function distanceToPaths(x:number,z:number,routes:Route[]){let d=Infinity;for(const r of routes)for(let i=1;i<r.points.length;i++)d=Math.min(d,distanceToSegment(x,z,r.points[i-1],r.points[i]));return d;}
function polygon(b:ModelBuilder,points:XY[],y:number,depth:number,color:string){const shape=new T.Shape(points.map(p=>new T.Vector2(p[0],-p[1])));const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false});g.rotateX(-Math.PI/2);b.add(g,color,[0,y-depth,0]);g.dispose();}
function wall(b:ModelBuilder,points:XY[],height:number){for(let i=0;i<points.length;i++){const a=points[i],c=points[(i+1)%points.length];const length=Math.hypot(c[0]-a[0],c[1]-a[1]);b.box([(a[0]+c[0])/2,height/2,(a[1]+c[1])/2],[3.3,height,length],palette.stone,[0,Math.atan2(c[0]-a[0],c[1]-a[1]),0]);const n=Math.ceil(length/18);for(let j=0;j<n;j++)b.box([a[0]+(c[0]-a[0])*j/n,height+.65,a[1]+(c[1]-a[1])*j/n],[2,1.3,2],palette.cream);}}
function result(b:ModelBuilder,id:PlaceModel['id'],eye:V3,target:V3,closeEye:V3,closeTarget:V3,radius:number,water?:PlaceModel['water']):PlaceModel{return {id,group:b.finish(`${id}_reference_v2`),routes:b.routes,overview:{eye,target},close:{eye:closeEye,target:closeTarget},radius,water,features:[]};}
function ribbon(b:ModelBuilder,path:XY[],width:number,height:number){
  const curve=new T.CatmullRomCurve3(path.map(p=>new T.Vector3(p[0],0,p[1])));const points=curve.getPoints(35);const positions:number[]=[];
  for(let i=0;i<points.length-1;i++){
    const p=points[i],c=points[i+1];const tangent=(j:number)=>{const a=points[Math.max(0,j-1)],d=points[Math.min(points.length-1,j+1)];return new T.Vector3(-(d.z-a.z),0,d.x-a.x).normalize().multiplyScalar(width/2);};
    const normal=tangent(i),nextNormal=tangent(i+1);
    for(let band=0;band<14;band++){
      const y0=band/14,y1=(band+1)/14;const h0=Math.pow(Math.sin((i+.8)/37*Math.PI),.65)*height,h1=Math.pow(Math.sin((i+1.8)/37*Math.PI),.65)*height;
      for(const side of [-1,1]){
        const a=[p.x+normal.x*side*(1-y0*.7),y0*h0,p.z+normal.z*side*(1-y0*.7)];
        const d=[p.x+normal.x*side*(1-y1*.7),y1*h0,p.z+normal.z*side*(1-y1*.7)];
        const e=[c.x+nextNormal.x*side*(1-y0*.7),y0*h1,c.z+nextNormal.z*side*(1-y0*.7)];
        const f=[c.x+nextNormal.x*side*(1-y1*.7),y1*h1,c.z+nextNormal.z*side*(1-y1*.7)];
        positions.push(...a,...e,...d,...d,...e,...f);
      }
    }
  }
  const raw=new T.BufferGeometry();raw.setAttribute('position',new T.Float32BufferAttribute(positions,3));const g=mergeVertices(raw);raw.dispose();g.computeVertexNormals();const tint=new T.Color('#8e9a90'),stoneColors=new Float32Array(g.getAttribute('position').count*3);for(let i=0;i<stoneColors.length;i+=3){stoneColors[i]=tint.r;stoneColors[i+1]=tint.g;stoneColors[i+2]=tint.b;}g.setAttribute('color',new T.BufferAttribute(stoneColors,3));
  // Preserve the strata colors; ModelBuilder.add intentionally recolors generic primitives.
  const list=b.buckets.get('windstone')??[];list.push(g);b.buckets.set('windstone',list);
}
export function buildReferenceKholinar():PlaceModel{
  const b=new ModelBuilder(),rng=random(112);
  // Read directly from the 1280 × 1933 published plan. SOUTH is at the top.
  const map=(p:XY):XY=>[(640-p[0])*.57,(900-p[1])*.57];
  const outline=[[132,593],[190,484],[301,454],[530,455],[750,441],[970,455],[1090,505],[1155,662],[1110,868],[1000,1050],[949,1193],[837,1290],[700,1340],[551,1320],[408,1264],[332,1168],[327,1030],[239,972],[176,811]].map(p=>map(p as unknown as XY));
  polygon(b,outline,0,16,'#9b8d73');wall(b,outline,18.3);
  const paths:XY[][]=[[[219,602],[354,659],[464,733],[543,832],[640,898],[764,873],[876,820],[995,661]],[[353,483],[461,525],[588,577],[751,604],[898,559],[1026,500]],[[281,920],[421,895],[541,880],[703,901],[881,903],[992,912]],[[374,1047],[488,1066],[638,1061],[791,1068],[910,1103]],[[474,1280],[515,1197],[553,1152],[640,1128],[781,1161],[840,1233]],[[292,703],[263,811],[340,891],[393,1005],[374,1102]],[[1023,720],[974,822],[925,980],[877,1074]]];
  paths.forEach((path,i)=>b.path(`mapped-boulevard-${i}`,path.map(p=>{const q=map(p);return [q[0],.2,q[1]];}),6,'Walking the city boulevards',palette.sand));
  const blades:XY[][]=[[[491,571],[544,534],[583,502],[610,529]],[[562,641],[603,584],[640,548],[695,566]],[[647,733],[657,681],[704,625],[753,598]],[[442,952],[407,885],[358,826]],[[354,1018],[315,934],[290,846]],[[800,892],[852,842],[878,764]],[[928,1001],[960,920],[974,832]],[[431,1196],[464,1155],[495,1118]],[[561,968],[679,937],[788,964]],[[854,1090],[789,1110],[749,1125]]];
  const mappedBlades=blades.map(p=>p.map(map));mappedBlades.forEach((p,i)=>ribbon(b,p,10+i%3*3,54+i%4*12));
  const bladeRoutes=mappedBlades.map((p,i)=>({id:`blade${i}`,points:p.map(([x,z])=>[x,0,z] as V3),activity:''}));
  for(let x=-275;x<290;x+=13)for(let z=-250;z<255;z+=13){
    const px=x+(rng()-.5)*3,pz=z+(rng()-.5)*3;
    if(!pointInPolygon([px,pz],outline as GeographyPoint[])||distanceToPaths(px,pz,b.routes)<10||distanceToPaths(px,pz,bladeRoutes)<19)continue;
    if((pz< -95&&pz> -170&&Math.abs(px)<100)||(Math.abs(px)<36&&pz> -36&&pz<37)||Math.hypot(px,pz)<24)continue;
    b.building(px,0,pz,7+rng()*3,7+rng()*3,5+rng()*12,['#bbb09a','#b4a18b','#c7bca7','#a2937f'][Math.floor(rng()*4)]);
  }
  const palace=map([640,1140]);b.box([palace[0],12,palace[1]],[112,24,37],'#9c927e');b.building(...[palace[0],24,palace[1],64,25,20,'#c8bda5'] as Parameters<ModelBuilder['building']>);
  for(const dx of [-43,43])b.building(palace[0]+dx,24,palace[1],21,23,16,'#c8bda5');
  const dais=map([525,1114]);b.cylinder([dais[0],25,dais[1]],22,4,palette.cream);b.building(dais[0],27,dais[1],11,11,8,palette.stone,'dome');
  b.path('sunwalk',[[palace[0]+35,25,palace[1]],[dais[0]-12,28,dais[1]]],4,'Crossing the Sunwalk',palette.cream,'human',true);
  const market=map([640,899]);const lamps=marketCourt(b,market);
  const park=map([750,1180]);for(let i=0;i<20;i++)b.tree(park[0]+(i%5)*7-16,0,park[1]+Math.floor(i/5)*7-10,5);
  b.routes.push({...b.routes[2],id:'supply-caravan',species:'chull'});
  const model=result(b,'kholinar',[515,410,550],[0,16,0],[market[0]+4.7,5.5,market[1]+25],[market[0]-.8,3.4,market[1]-2],640);model.group.userData.lampSites=lamps;model.group.userData.marketCourt=market;return model;
}
export function buildReferenceAzimir():PlaceModel{
  const b=new ModelBuilder([0,0,64],'ashlar'),rng=random(515);b.box([0,-6,0],[720,12,840],'#a69473');
  // Palace is central; Grand Market lies southeast in the published plan.
  const main:V3[][]=[[[0,.2,-410],[0,.2,-80],[0,.2,-48]],[[0,.2,55],[0,.2,410]],[[-350,.2,0],[-76,.2,0]],[[76,.2,0],[350,.2,0]],[[-350,.2,-300],[-90,.2,-130],[0,.2,-80],[90,.2,-130],[350,.2,-300]],[[-350,.2,270],[-100,.2,150],[60,.2,113],[210,.2,83],[350,.2,160]]];
  main.forEach((p,i)=>b.path(`grand-boulevard-${i}`,p,10,'Walking the great boulevards'));
  // Rectilinear blocks with diagonals and fan-shaped approaches, as shown in the plan.
  for(let i=-9;i<=9;i++){
    const x=i*34;b.path(`grid-north-${i}`,[[x,.2,-390],[x,.2,-88]],4,'Crossing the civic district');
    if(Math.abs(x)>82)b.path(`grid-south-${i}`,[[x,.2,-60],[x,.2,375]],4,'Crossing the civic district');
  }
  for(let i=-10;i<=10;i++){const z=i*34;if(Math.abs(z)<85)continue;b.path(`grid-east-${i}`,[[-320,.2,z],[320,.2,z]],4,'Visiting the city courts');}
  for(let x=-320;x<=320;x+=16)for(let z=-390;z<390;z+=16){
    if(Math.hypot(x,z)<84||Math.hypot(x-60,z-113)<40||distanceToPaths(x,z,b.routes)<7.6)continue;
    b.building(x,0,z,8+rng()*3,8+rng()*3,5+rng()*10,['#c3ae88','#aa8e6c','#d0b793','#b19c77'][Math.floor(rng()*4)],rng()>.6?'dome':'flat');
  }
  // Rounded palace ensemble is a compact diamond, not a northern European fortress.
  const diamond:XY[]=[[0,-70],[70,0],[0,70],[-70,0]];polygon(b,diamond,1,1,'#c1aa7a');wall(b,diamond,7);
  for(const [x,z,r] of [[0,0,25],[-37,0,14],[37,0,14],[0,-37,14],[0,37,14]]){
    b.cylinder([x,10,z],r,18,'#987349','metal');b.sphere([x,22,z],[r*1.04,r*.85,r*1.04],palette.bronze,'metal');b.cone([x,22+r*.9,z],.75,8,palette.bronze);
  for(let i=0;i<24;i++){const a=i/24*Math.PI*2;b.box([x+Math.sin(a)*(r+.1),11,z+Math.cos(a)*(r+.1)],[1.1,5,.12],palette.window,[0,a,0],'window');}
  }
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;b.tree(Math.sin(a)*56,1,Math.cos(a)*56,5,false,true);}
  b.cylinder([60,1,113],33,2,palette.cream);b.building(60,2,113,42,42,12,'#b39a6e','dome');
  b.path('palace-perimeter',[[0,.2,-80],[80,.2,0],[0,.2,80],[-80,.2,0],[0,.2,-80]],6,'Approaching the Bronze Palace');
  b.routes.push({...b.routes[0],id:'chull-boulevard',species:'chull'});
  return result(b,'azimir',[590,520,670],[0,0,0],[35,11,96],[0,4,64],650);
}
export function buildReferenceThaylen():PlaceModel{
  const b=new ModelBuilder([-415,0,63],'plaster'),rng=random(331);
  const map=(p:XY):XY=>[(p[0]-1290)*.62,(p[1]-550)*.62];
  const outline=[[1030,407],[1150,349],[1280,284],[1402,131],[1507,145],[1586,229],[1640,133],[1710,286],[1790,308],[1818,394],[1840,590],[1780,749],[1630,865],[1500,1006],[1370,1025],[1217,942],[1110,927],[1028,935]].map(p=>map(p as unknown as XY));
  const groundOutline=[[530,540],[620,423],[820,363],[1025,378],[1390,96],[1630,80],[1900,288],[1900,840],[1550,1150],[1080,1020],[721,927],[572,744]].map(p=>map(p as unknown as XY));
  polygon(b,groundOutline,0,40,'#94947d');
  // The city occupies a western coast, not a tiny isolated city-shaped island.
  b.box([3310,-20,0],[6000,40,12000],'#94947d');
  const center:XY=[0,0];const radial:V3[][]=[];
  for(let ring=0;ring<3;ring++){
    const radius=45+ring*35;const points=Array.from({length:7},(_,i)=>[Math.sin(i/6*Math.PI*2)*radius,.2,Math.cos(i/6*Math.PI*2)*radius] as V3);radial.push(points);
  }
  // Three large loops and six arms preserve the Ancient Ward's star-like structure.
  for(let i=0;i<6;i++){const a=i/6*Math.PI*2;radial.push([[center[0],.2,center[1]],[Math.sin(a)*121,.2,Math.cos(a)*121]]);}
  radial.forEach((p,i)=>b.path(`ancient-ward-${i}`,p,5,'Walking the Ancient Ward'));
  const wardPaths:XY[][]=[[[1070,420],[1080,700],[1082,890]],[[1120,375],[1270,353],[1476,369],[1536,554],[1493,759],[1276,774],[1120,699],[1120,375]],[[1490,353],[1439,270],[1489,173]],[[1540,374],[1578,271],[1640,252],[1680,330],[1719,522],[1710,694],[1580,810]],[[1280,800],[1310,877],[1410,961],[1490,990]],[[1130,515],[990,528],[880,571],[726,670],[592,665]]];
  wardPaths.forEach((path,i)=>b.path(`ward-road-${i}`,path.map(p=>{const q=map(p);return [q[0],.2,q[1]];}),7,'Traveling between wards'));
  for(let px=1050;px<1820;px+=20)for(let py=150;py<1000;py+=20){
    const [x,z]=map([px+(rng()-.5)*7,py+(rng()-.5)*7]);if(!pointInPolygon([x,z],outline as GeographyPoint[])||distanceToPaths(x,z,b.routes)<8||Math.hypot(x-290,z)<30||Math.hypot(x-242,z+195)<32)continue;
    b.building(x,0,z,7+rng()*3,7+rng()*3,5+rng()*11,['#b6bcad','#d1c6ad','#a5b1a7','#b4a792'][Math.floor(rng()*4)],rng()>.7?'pitched':'flat');
  }
  // The wall is west of the Low Ward. The broad field extends west to the docks.
  const wallA=map([1040,409]),wallB=map([1040,935]);wall(b,[wallA,wallB],18);
  const palace=map([1760,545]);b.box([palace[0],8,palace[1]],[63,16,48],palette.stone);b.building(palace[0],16,palace[1],45,30,23,palette.cream,'pitched');
  const gate=map([1680,245]);b.cylinder([gate[0],2,gate[1]],24,4,palette.cream);b.building(gate[0],4,gate[1],8,8,6,palette.stone,'dome');
  for(let i=0;i<9;i++){
    const z=-12+i*15,shore=-471+(z+6)*.205,x=shore-15;b.box([x,1,z],[44,2,5],palette.wood);b.path(`western-dock-${i}`,[[x+16,2.2,z],[x-18,2.2,z]],2,'Unloading a merchant vessel',palette.wood);
    for(const offset of [-18,-5,9,20])b.cylinder([x+offset,-2,z],.35,8,palette.wood);
    if(i%2===0)sailingBoat(b,x-29,-4.4,z+7,25,.07);
  }
  b.path('shore-cargo-road',Array.from({length:9},(_,i)=>{const z=-12+i*15;return [-461+(z+6)*.205,.2,z] as V3;}),4,'Carrying cargo along the quay');
  for(let i=0;i<24;i++){const a=-.1+i/23*Math.PI;const x=140+Math.sin(a)*300,z=-80+Math.cos(a)*440;b.rock(x,-22,z,60,90+rng()*130,65,'#7a8177',i);}
  b.routes.push({...b.routes.at(-12)!,id:'merchant-caravan',species:'chull'});
  return result(b,'thaylen-city',[-740,590,710],[-40,0,0],[-376,14,80],[-415,4,63],900,{y:-5,size:3500,shallow:false});
}
export function buildReferenceVedenar():PlaceModel{
  const b=new ModelBuilder([0,0,88],'plaster'),rng=random(603);polygon(b,[[-6000,-10000],[6000,-10000],[6000,180],[550,205],[270,195],[110,230],[-80,208],[-310,175],[-6000,185]],0,60,'#87917b');
  for(let ring=0;ring<4;ring++){
    const r=36+ring*34;
    const points=Array.from({length:49},(_,i)=>[Math.sin(i/48*Math.PI*2)*r,.2,Math.cos(i/48*Math.PI*2)*r-50] as V3);b.path(`civic-circle-${ring}`,points,5,'Walking the garden district');
  }
  for(let i=0;i<6;i++){const a=i/6*Math.PI*2;const p:V3[]=[[Math.sin(a)*155,.2,Math.cos(a)*155-50],[Math.sin(a+1.05)*77,.2,Math.cos(a+1.05)*77-50],[0,.2,-50]];b.path(`cymatic-arrow-${i}`,p,6,'Crossing a temple court');}
  for(let x=-240;x<240;x+=17)for(let z=-290;z<140;z+=17){if(distanceToPaths(x,z,b.routes)<9||Math.abs(x)<30&&Math.abs(z+50)<30)continue;b.building(x,0,z,9+rng()*2,9+rng()*2,6+rng()*10,['#b7a895','#cdbba7','#a6b3a2'][Math.floor(rng()*3)],rng()>.7?'dome':'flat');}
  b.building(0,0,-50,30,30,24,palette.cream,'dome');
  for(let i=0;i<6;i++){
    const a=i/6*Math.PI*2,x=Math.sin(a)*183,z=Math.cos(a)*183-50;
    b.cylinder([x,18,z],27,3,'#a8a58e');b.cylinder([x,8,z],7,20,palette.stone);
    for(let j=0;j<12;j++){const aa=j*2.4,rr=5+Math.sqrt(j)*5;b.tree(x+Math.sin(aa)*rr,19.5,z+Math.cos(aa)*rr,4+rng()*3);}
  }
  for(let i=0;i<20;i++)b.rock(-320,-35,170-i*25,35,65,25,'#788778',i);
  // River lies west of the city; the southern cliffs meet the Tarat Sea.
  b.box([-275,.15,-60],[14,.2,440],'#3c797d');
  return result(b,'vedenar',[510,360,510],[0,15,-50],[0,3.5,88],[25,4,83],600,{y:-43,size:2500,shallow:false});
}
