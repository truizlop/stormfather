import * as T from 'three';
import {prayerStatue} from './landmarkDetails';
import {sailingBoat} from './maritime';
import {archway,facadeWindow} from './architecture';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {refineTerrain} from '../terrainMesh';
import {ModelBuilder,random,palette,type PlaceModel,type V3} from './kit';

function lamp(b:ModelBuilder,x:number,y:number,z:number,ceramic=false){
 b.cylinder([x,y+1.7,z],.07,3.4,'#685c49');b.beam([x,y+3.35,z],[x+.55,y+3.35,z],.08,'#786449');
 b.sphere([x+.55,y+3,z],[.25,.33,.25],ceramic?'#c5b397':'#9dcdd3','lamp');b.cylinder([x+.55,y+3.3,z],.28,.1,'#746249');
}
function urn(b:ModelBuilder,x:number,y:number,z:number,s=1){b.sphere([x,y+.45*s,z],[.33*s,.45*s,.33*s],'#b58360');b.cylinder([x,y+.85*s,z],.22*s,.18*s,'#c79870');b.cylinder([x,y+.95*s,z],.17*s,.01,'#453b32');}
function statue(b:ModelBuilder,x:number,y:number,z:number,s=1){prayerStatue(b,x,y,z,s);}
function wedgeHouse(b:ModelBuilder,x:number,z:number,w:number,d:number,h:number,color:string){
 // Eastern face slopes back from the storm. Openings are on the sheltered west.
 const shape=new T.Shape([new T.Vector2(-w/2,0),new T.Vector2(w/2,0),new T.Vector2(w*.05,h),new T.Vector2(-w/2,h)]);
 const g=new T.ExtrudeGeometry(shape,{depth:d,bevelEnabled:true,bevelSize:.07,bevelThickness:.07,bevelSegments:1});b.add(g,color,[x,0,z-d/2],[1,1,1],[0,0,0],'masonry');g.dispose();const bounds={minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,bottom:0,top:h};b.obstacles.push(bounds);b.cameraObstacles.push(bounds);
 b.beam([x-w/2,h+.12,z-d/2],[x+w*.05,h+.12,z-d/2],.3,'#c9bfa2');
 b.box([x-w/2-.04,1.35,z],[.12,2.7,1.3],palette.wood);
 archway(b,[x-w/2-.18,0,z],1.93,2.38,.71,.37,-Math.PI/2,'#b9b8a3');
 b.box([x-w/2-.11,.28,z],[.33,.56,d+.16],'#757d6d',[0,0,0],'cutstone');
 b.box([x-w/2-.1,h-.12,z],[.32,.22,d+.18],'#b7b8a3',[0,0,0],'cutstone');
 for(const side of [-1,1]){
  facadeWindow(b,[x-w/2-.09,1.33,z+side*d*.28],1.2,1.65,-Math.PI/2,Math.round(x+z+side)%3!==0,true);
  b.beam([x-w/2,h+.08,z+side*d/2],[x+w*.05,h+.08,z+side*d/2],.2,'#a9ac95');
  for(let yy=.7;yy+.15<h-.3;yy+=.8)b.box([x-w/2-.065,yy,z+side*(d/2-.23)],[.16,.3,.46],'#b3b29b',[0,0,0],'cutstone');
 }
 for(const yy of [.6,2])b.box([x-w/2-.125,yy,z],[.035,.07,1.23],'#424c40',[0,0,0],'metal');
 b.box([x-w/2-1,.15,z],[2,.3,2.3],'#bfb69c');urn(b,x-w/2-1.3,0,z+d*.37,.8);
}
function boat(x:number,y:number,z:number,length=22,yaw=0){
 const boatB=new ModelBuilder();sailingBoat(boatB,0,0,0,length,0,length<16);const group=boatB.finish('Rigged_merchant_boat');group.position.set(x,y,z);group.rotation.y=yaw;return group;
}
export function buildHearthstone():PlaceModel{
 const b=new ModelBuilder([-143,0,60]),rng=random(730);b.cylinder([0,-6,0],330,12,'#9d9275');
 // One hundred modest structures, clear western approaches and an eastern breakwall.
 for(let row=-5;row<=4;row++)for(let col=0;col<10;col++){const x=-220+col*30,z=row*33;wedgeHouse(b,x,z,17+rng()*3,17+rng()*4,5+rng()*2.8,['#ac9b7a','#b8a689','#9c947f'][col%3]);}
 for(let c=0;c<10;c++)b.path(`hearth-lane-${c}`,[[-233+c*30,.2,-185],[-233+c*30,.2,159]],5,'Visiting neighbors and the bakery','#afa182');
 b.path('hearth-market',[[-230,.22,182],[93,.22,182]],7,'Trading grain in the village square','#b4a687');
 for(let i=0;i<5;i++)b.stall(-104+i*12,0,193,['#99755d','#8b9a80','#bf9a68'][i%3]);
 b.building(-42,0,238,44,26,10,'#c1b69c');
 for(let i=0;i<6;i++){b.cylinder([107,5,-115+i*32],8,10,'#aa9673');b.cone([107,11,-115+i*32],8.5,3,'#c1b394');b.box([98.9,1.8,-115+i*32],[.4,3,2],'#5f4c3b');}
 const bluff=new T.BoxGeometry(61,64,445,3,8,56),bp=bluff.getAttribute('position');for(let i=0;i<bp.count;i++){const x=bp.getX(i),y=bp.getY(i),z=bp.getZ(i),rise=(y+32)/64;bp.setXYZ(i,x+Math.sin(z*.08+y*.12)*2+rise*8,y+(Math.sin(z*.025)*7+Math.sin(z*.11)*2)*rise,z);}bluff.computeVertexNormals();b.add(bluff,'#85816a',[186,31,0]);bluff.dispose();
 // The manor's white stormward buttresses slope with the rest of the town.
 wedgeHouse(b,69,239,61,50,19,'#d8d4bb');for(let i=-2;i<=2;i++)b.cylinder([29,7.5,239+i*9],.75,15,'#d5cdb5');
 b.box([23,15.4,239],[18,.8,51],'#ddd4bb');
 for(let i=0;i<32;i++){const a=i*2.399,r=15+Math.sqrt(i)*5;b.sphere([-26+Math.cos(a)*r,.5,242+Math.sin(a)*r],[1.8,.65,1.2],i%3?'#747f4d':'#b47e71');}
 for(let i=0;i<150;i++){const x=-290+rng()*100,z=-255+rng()*65;b.sphere([x,.35,z],[1.25,.4,1],'#697957');}
 b.routes.push({id:'hearth-chulls',points:[[-275,.2,193],[-180,.2,218],[-130,.2,230]],species:'chull',activity:'Hauling sacks of lavis'});
 for(let i=0;i<10;i++)lamp(b,-233+i*30,0,171);return {id:'hearthstone',group:b.finish('Hearthstone_v2'),routes:b.routes,radius:340,overview:{eye:[-455,300,445],target:[0,12,0]},close:{eye:[-143,4.6,35],target:[-143,1.7,60]},features:['East-sloping houses','Sheltering breakwall','White manor and grain stores']};
}
export function buildRevolar():PlaceModel{
 const b=new ModelBuilder([0,0,30]),rng=random(819);
 const height=(x:number,z:number)=>Math.max(0,Math.hypot(x,z)-160)*.26*(.8+Math.sin(Math.atan2(z,x)*3)*.2)*(1-T.MathUtils.smoothstep(Math.hypot(x,z),400,580));
 const roadHeight=(x:number,z:number)=>Math.max(height(x-5,z),height(x+5,z),height(x,z-5),height(x,z+5))+.4;
 const positions:number[]=[],indices:number[]=[];for(let ring=0;ring<=40;ring++)for(let j=0;j<=120;j++){const a=j/120*Math.PI*2,r=580*ring/40,x=Math.sin(a)*r,z=Math.cos(a)*r;positions.push(x,height(x,z)-.25,z);if(ring<40&&j<120){const k=ring*121+j;indices.push(k,k+121,k+1,k+1,k+121,k+122);}}const terrain=new T.BufferGeometry();terrain.setAttribute('position',new T.Float32BufferAttribute(positions,3));terrain.setIndex(indices);terrain.computeVertexNormals();b.add(terrain,'#a39475');terrain.dispose();
 for(let i=0;i<72;i++){const a=i/72*Math.PI*2;if(i%18<2)continue;const x=Math.sin(a)*190,z=Math.cos(a)*190;b.box([x,8,z],[18,16,5],'#8e826d',[0,a,0]);if(i%6===0)b.cylinder([x,10,z],5.5,20,'#a3957d');}
 for(let row=-10;row<=10;row++)for(let col=-10;col<=10;col++){const x=col*32+(rng()-.5)*9,z=row*33+(rng()-.5)*7,r=Math.hypot(x,z);if(r>360||r>171&&r<207||Math.abs(col)%4===0||row%5===0||Math.hypot(x,z)<38)continue;
 b.building(x,height(x,z),z,17+rng()*5,18+rng()*5,6+rng()*15,['#b1a287','#c0ac8f','#9d967f','#b39373'][(row-col+40)%4]);}
 for(let col=-8;col<=8;col+=4){const points:V3[]=[];for(let z=-312;z<=312;z+=24)points.push([col*32,roadHeight(col*32,z),z]);b.path(`revolar-lane-${col}`,points,7,'Crossing the older city walls','#b8a385');}
 for(let row=-10;row<=10;row+=5){const points:V3[]=[];for(let x=-312;x<=312;x+=24)points.push([x,roadHeight(x,row*33),row*33]);b.path(`revolar-cross-${row}`,points,7,'Visiting the city market','#b8a385');}
 b.cylinder([0,.5,0],25,1,'#c4b69a');for(let i=0;i<8;i++){const a=i/8*Math.PI*2;b.stall(Math.sin(a)*29,0,Math.cos(a)*29,['#995c49','#6c8d8a','#be9c68'][i%3]);}
 b.path('eastern-caravan',Array.from({length:13},(_,i)=>[365,roadHeight(365,-144+i*24),-144+i*24] as V3),9,'Caravans bound for Kholinar','#a89370','chull');
 for(let i=-3;i<=3;i++)b.building(399,height(399,i*35),i*35,25,22,5,'#a28f73');
 for(let i=-4;i<=4;i++)lamp(b,9,0,i*32);return {id:'revolar',group:b.finish('Revolar_v2'),routes:b.routes,radius:560,overview:{eye:[-590,450,580],target:[0,18,0]},close:{eye:[0,4,70],target:[0,2,30]},features:['Older inner boundary walls','Irregular hillside growth','Eastern caravan yards']};
}
export function buildKasitor():PlaceModel{
 const b=new ModelBuilder([0,0,48]),rng=random(214),ships:T.Group[]=[];
 // Bay on the northern side; the waterfront is kept clear for the viewing platform.
 b.box([0,-6,145],[810,12,490],'#a19574');
 for(let row=0;row<8;row++)for(let col=-9;col<=9;col++){const x=col*37,z=48+row*38;if(col%4===0||row%3===2)continue;b.building(x,0,z,25,25,9+rng()*16,['#b37352','#be8862','#9f634a','#b99a72'][(col+row+30)%4]);
 if((row+col)%4===0){b.box([x,5,z+13.6],[20,.25,3.5],'#c2ae8b');for(let j=-4;j<=4;j++)b.box([x+j*2.2,5.7,z+15.2],[.08,1.2,.09],'#8b7251');}}
 b.box([0,.12,-13],[276,.1,64],'#acaa98',[0,0,0],'paving');
 b.path('kasitor-promenade',[[-330,.3,-43],[330,.3,-43]],10,'Watching the bay and meeting the tide','#c3b496');
 for(let col=-8;col<=8;col+=4)b.path(`kasitor-avenue-${col}`,[[col*37,.3,-28],[col*37,.3,307]],9,'Walking from the docks into the brick city','#baa283');
 for(let row=0;row<3;row++)b.path(`kasitor-market-${row}`,[[-325,.32,125+row*114],[325,.32,125+row*114]],7,'Trading under the awnings','#bca688');
 b.box([0,1.1,-92],[90,2.2,66],'#b6a685');for(let j=-5;j<=5;j++)b.box([j*8,2.1,-120],[.22,2,.22],'#88754f');b.box([0,3.1,-120],[87,.15,.2],'#b09a67');
 b.path('protector-viewing-platform',[[0,2.25,-64],[0,2.25,-113]],5,'Waiting at the viewing platform','#c7b991');
 for(const x of [-115,115])for(const z of [-175,-287]){b.cylinder([x,2,z],10,8,'#b69a52','metal');b.cylinder([x,6.2,z],12,.6,'#d4ba68','metal');}
 for(const x of [-278,-198,210,292]){b.box([x,.3,-116],[13,2.4,145],'#77634a');for(let j=0;j<22;j++)b.box([x,1.6,-51-j*6],[13.4,.2,.9],'#b29b72');ships.push(boat(x+22,-.4,-113,30,-.03));}
 for(let j=-6;j<=6;j++){b.stall(j*20,0,-17,['#557f79','#b99764','#965c58'][Math.abs(j)%3]);lamp(b,j*45,0,-47);urn(b,j*45-3,0,-45,1.3);}
 b.path('dock-chulls',[[-350,.25,3],[350,.25,3]],8,'Moving goods along the quay','#a18c6b','chull');
 const group=b.finish('Kasitor_v2');group.add(...ships);return {id:'kasitor',group,routes:b.routes,radius:540,water:{y:-1,size:1800,shallow:false},overview:{eye:[-590,370,-650],target:[0,9,15]},close:{eye:[0,3.7,77],target:[-22,3.2,50]},features:['Brick-built harbor city','Viewing platform over the bay','Four golden pedestals']};
}
export function buildRallElorim():PlaceModel{
 const b=new ModelBuilder([-94,0,25]),rng=random(631),extra:T.Group[]=[];
 // A continuous vaulted overhang, with dwellings cut into pendant stone spires.
 const profile=new T.Shape();profile.moveTo(-445,0);profile.quadraticCurveTo(-490,430,-80,440);profile.quadraticCurveTo(420,470,440,30);profile.lineTo(345,0);profile.quadraticCurveTo(320,280,0,279);profile.quadraticCurveTo(-310,270,-335,0);profile.closePath();
 const rock=new T.ExtrudeGeometry(profile,{depth:230,bevelEnabled:true,bevelSize:12,bevelThickness:12,bevelSegments:2,steps:4});rock.deleteAttribute('normal');rock.deleteAttribute('uv');const welded=mergeVertices(rock);const wp=welded.getAttribute('position'),wi=welded.getIndex()!;const points:V3[]=Array.from({length:wp.count},(_,i)=>[wp.getX(i),wp.getY(i),wp.getZ(i)]);const faces:[number,number,number][]=Array.from({length:wi.count/3},(_,i)=>[wi.getX(i*3),wi.getX(i*3+1),wi.getX(i*3+2)]);const refined=refineTerrain(points,faces,24);const crag=new T.BufferGeometry();crag.setAttribute('position',new T.Float32BufferAttribute(refined.points.flat(),3));crag.setIndex(refined.faces.flat());welded.dispose();const rp=crag.getAttribute('position');
 for(let i=0;i<rp.count;i++){const x=rp.getX(i),y=rp.getY(i),z=rp.getZ(i);const grain=Math.sin(x*.059+y*.081)*Math.cos(z*.037+y*.029)*4+Math.sin(x*.14+y*.21+z*.09)*1.8;rp.setXYZ(i,x+grain,y+grain*.5,z+grain*1.7+Math.sin(y*.12)*2.5);}crag.computeVertexNormals();b.add(crag,'#858b75',[0,-4,-340],[1,1,1],[0,0,0],'rock');rock.dispose();crag.dispose();
 const back=new T.BoxGeometry(650,270,30,32,18,2),backPos=back.getAttribute('position');for(let i=0;i<backPos.count;i++){const x=backPos.getX(i),y=backPos.getY(i);backPos.setZ(i,backPos.getZ(i)+Math.sin(x*.05+y*.06)*4+Math.sin(y*.12)*2);}back.computeVertexNormals();b.add(back,'#7e856f',[0,131,-314],[1,1,1],[0,0,0],'rock');back.dispose();
 for(let j=-5;j<=5;j++){const x=j*66,h=70+rng()*76;const pendant=new T.ConeGeometry(32,h,48,12);b.add(pendant,'#8c8d76',[x,280-h*.38,-117],[1,1,1],[Math.PI,0,0],'rock');pendant.dispose();
 for(let level=0;level<5;level++){const y=251-level*17,width=34-level*4.4;if(y<280-h*.8)continue;b.box([x,y,-101],[width,3,27],'#b5b198');for(const dx of [-.27,0,.27])facadeWindow(b,[x+dx*width,y+2.5,-86.9],2.8,5,0,true,true,false);}}
 for(let terrace=0;terrace<4;terrace++){const z=-175+terrace*55,y=(3-terrace)*16;b.box([0,y-7,z],[646,14,53],'#989982');
 for(let col=-7;col<=7;col++){if(col===0&&terrace>0)continue;const x=col*41,w=25+rng()*4;b.building(x,y,z,w,28,9+rng()*10,['#aca88e','#b9b19a','#999d88'][(col+terrace+20)%3],'dome');if(col%2===0)b.tree(x+15,y,z+12,5,false);}
 b.path(`rall-terrace-${terrace}`,[[-310,y+.2,z+22],[310,y+.2,z+22]],5,'Walking beneath the overhang','#b3ad92');for(let i=-6;i<=6;i++){lamp(b,i*48,y,z+18,true);if(i%2===0)statue(b,i*48+3,y,z+17,.8);}}
 // Stepped temple rises at the edge of the reservoir, as in Kurdi's published art.
 for(let level=0;level<6;level++){const width=78-level*10;b.box([0,level*10+5,-22],[width,10,65-level*8],'#b3ab8f');b.box([0,level*10+10,-22],[width+3,1,68-level*8],'#c8bea0');for(const side of [-1,1])b.cylinder([side*width*.35,level*10+6,12-level*4],1,8,'#cfbea1');}
 // Open reservoir, perimeter walk and a separate temple/Oathgate on its central dais.
 for(let j=0;j<80;j++){const a=j/80*Math.PI*2,x=Math.sin(a)*183,z=158+Math.cos(a)*183;b.box([x,1.2,z],[15,3,9],'#a9a992',[0,a,0]);if(j%4===0)statue(b,x,2.7,z,1);}
 b.cylinder([0,1.4,158],31,3.8,'#b1ad98');b.cylinder([0,3.5,158],27,.5,'#c9c4a7');b.building(0,3.8,158,14,14,12,'#c0b99f','dome');
 b.path('rall-reservoir-bridge',[[0,3.9,342],[0,3.9,187]],5,'Crossing to the reservoir temple','#b6b096');for(const x of [-3,3])b.beam([x,5.1,342],[x,5.1,188],.14,'#cec4a3');
 b.path('rall-waterfront',[[-175,3.1,90],[-190,3.1,170],[-137,3.1,285],[0,3.1,342],[130,3.1,286]],6,'Walking the statue-lined reservoir','#b1b399');
 const outline=profile.getPoints(160);const ceiling=(x:number)=>{let top=0;for(let i=1;i<outline.length;i++){const a=outline[i-1],c=outline[i];if((x-a.x)*(x-c.x)<=0&&Math.abs(c.x-a.x)>.01)top=Math.max(top,a.y+(c.y-a.y)*(x-a.x)/(c.x-a.x));}return top;};
 for(let j=0;j<95;j++){const x=(rng()-.5)*700,z=-290+rng()*150;b.tree(x,ceiling(x)-8,z,7+rng()*12);}
 for(let j=0;j<90;j++){const x=(rng()-.5)*730,y=240+rng()*100,z=-99;b.beam([x,y,z],[x+Math.sin(j)*3,y-12-rng()*26,z+3],.5,'#577953');}
 extra.push(boat(-94,-.3,204,13,.7),boat(123,-.3,189,11,-.4));
 const group=b.finish('Rall_Elorim_v2');group.add(...extra);return {id:'rall-elorim',group,routes:b.routes,radius:570,water:{y:0,size:1800,shallow:false},overview:{eye:[-660,330,730],target:[0,165,-50]},close:{eye:[-177,6,213],target:[-43,103,-108]},features:['Great overhang and pendant dwellings','Waterfalls and reservoir temple','Vines and prayer statues']};
}
