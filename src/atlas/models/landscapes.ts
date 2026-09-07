import {ruinedHouse,stoneColumn} from './landmarkDetails';
import {addPlainsActivities} from './activitySets';
import * as T from 'three';
import { ModelBuilder,random,palette,mountains,type PlaceModel,type V3 } from './kit';

type CellPoint=[number,number];
function clipCell(points:CellPoint[],nx:number,nz:number,limit:number):CellPoint[]{
  const out:CellPoint[]=[];
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length],da=a[0]*nx+a[1]*nz-limit,db=b[0]*nx+b[1]*nz-limit;
    if(da<=0)out.push(a);
    if((da<=0)!==(db<=0)){const t=da/(da-db);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}
  }return out;
}
export function buildPlains():PlaceModel{
  const b=new ModelBuilder([-450,0,33]),rng=random(414);
  b.box([0,-49,0],[1040,10,960],'#514d44');
  // The published drawing maps plateau density, not individual hexagonal towers.
  // Partition a fourfold seed field into adjoining irregular cells, then inset
  // their boundaries to cut chasms. Erosion increases towards the east.
  const sites:CellPoint[]=[[0,0]];
  for(let x=0;x<7;x++)for(let z=0;z<7;z++){
    const cx=34+x*57+(rng()-.5)*32,cz=34+z*57+(rng()-.5)*32;
    if(Math.hypot(cx,cz)>440||Math.hypot(cx,cz)<85)continue;
    for(let rot=0;rot<4;rot++){const a=rot*Math.PI/2;sites.push([cx*Math.cos(a)-cz*Math.sin(a),cx*Math.sin(a)+cz*Math.cos(a)]);}
  }
  const plateaus:{x:number;z:number;h:number;points:CellPoint[]}[]=[];
  sites.forEach((site,index)=>{
    const [x,z]=site,r=Math.hypot(x,z),angle=Math.atan2(z,x);
    const density=(Math.sin(r*.041+Math.cos(angle*4)*2)+1)*.5;
    const gap=index===0?1.5:1.5+density*3+(x>100?3:0);
    let points:CellPoint[]=[[-400,-430],[430,-430],[430,430],[-400,430]];
    for(const other of sites){if(other===site)continue;const nx=other[0]-x,nz=other[1]-z;
      points=clipCell(points,nx,nz,(other[0]**2+other[1]**2-x*x-z*z)/2-gap*Math.hypot(nx,nz));if(points.length<3)return;}
    // Preserve a broad western chasm where the giant forages, away from bridges.
    if(index!==0&&x< -65)points=clipCell(points,0,z>0?-1:1,-13);
    if(points.length<3)return;
    const top=index===0?3:3+rng()*1.3;
    const shape=new T.Shape(points.map(([px,pz])=>new T.Vector2(px,-pz)));
    const geometry=new T.ExtrudeGeometry(shape,{depth:47+top,bevelEnabled:true,bevelSize:.12,bevelThickness:.08,bevelSegments:1,steps:12});geometry.rotateX(-Math.PI/2);
    const sides=geometry.getAttribute('position');for(let v=0;v<sides.count;v++){const yy=sides.getY(v),xx=sides.getX(v),zz=sides.getZ(v);if(yy>0&&yy<46+top){const erosion=Math.sin(xx*.4+zz*.37+yy*.61)*.18;sides.setXYZ(v,xx+erosion,yy,zz+erosion*.7);}}geometry.computeVertexNormals();
    b.add(geometry,index%3?'#998269':'#a38b6e',[0,-47,0],[1,1,1],[0,0,0],'rock');geometry.dispose();
    // Thin strata trace the actual cliff edges, rather than floating inside them.
    for(let level=0;level<3;level++)for(let i=0;i<points.length;i++){
      const a=points[i],c=points[(i+1)%points.length];b.beam([a[0],-9-level*11,a[1]],[c[0],-9-level*11,c[1]],.18,'#b09673');
    }
    if(index%11===0&&index>0)b.sphere([x,top+.5,z],[1.2,.5,1.2],'#6f7759');
    plateaus.push({x,z,h:top,points});
  });
  // Stormseat survives at the center; the west/southwest dais holds its Oathgate.
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;b.building(Math.sin(a)*18,3,Math.cos(a)*18,5,5,4+rng()*6,'#867c65','dome');}
  b.cylinder([-18,4,18],10,2,palette.cream);
  b.path('central-court',[[-14,3.2,0],[14,3.2,0]],4,'Walking among the ruins');
  b.box([-455,-14,0],[90,28,470],'#99816a');
  for(let row=-6;row<=6;row++)for(let col=0;col<3;col++)b.building(-483+col*27,0,row*31,15,18,4,'#ad9877',col%2?'pitched':'flat');
  for(let i=0;i<2;i++)b.path(`warcamp-${i}`,[[ -470+i*27,.2,-215],[-470+i*27,.2,215]],5,'Moving supplies through the warcamp',palette.sand,i===0?'chull':'human');
  const western=plateaus.filter(p=>p.x< -350&&Math.abs(p.z)<170).sort((a,b)=>Math.abs(a.z)-Math.abs(b.z));
  for(const [i,p] of western.slice(0,3).entries()){
    const start:V3=[-412,.35,p.z],end:V3=[p.x,p.h+.2,p.z];
    b.path(`permanent-bridge-${i}`,[start,end],4,'Crossing a permanent western bridge',palette.wood,'human',true);
    for(const side of [-1,1]){
      b.beam([start[0],start[1]+1,start[2]+side*2],[end[0],end[1]+1,end[2]+side*2],.14,palette.wood);
      for(let k=0;k<=8;k++){const t=k/8,x=start[0]+(end[0]-start[0])*t,y=start[1]+(end[1]-start[1])*t;b.box([x,y+.5,p.z+side*2],[.18,1,.18],palette.wood);}
    }
  }
  b.box([-431,1.4,215],[4.8,.45,18],palette.wood);for(let z=207;z<=223;z+=2)b.box([-431,1.75,z],[5,.2,.5],'#a48b61');
  b.routes.push({id:'chasm-corridor',points:[[-330,-43,0],[-90,-43,0],[-65,-43,0]],activity:'Foraging in the chasm',species:'chasmfiend'});
  addPlainsActivities(b);
  const group=b.finish('Shattered_Plains_v2');
  const area=plateaus.reduce((sum,p)=>sum+Math.abs(p.points.reduce((a,v,i)=>{const q=p.points[(i+1)%p.points.length];return a+v[0]*q[1]-q[0]*v[1];},0))*.5,0);
  group.userData.plateauCoverage=area/(830*860);group.userData.plateauCount=plateaus.length;
  return {id:'shattered-plains',group,routes:b.routes,overview:{eye:[640,560,760],target:[-50,-8,0]},close:{eye:[-450,8,80],target:[-443,3,33]},radius:800,features:['Fourfold plateau density','Western camps and bridges','Narrow irregular fractures']};
}
export function buildShinovar():PlaceModel{
  const b=new ModelBuilder([0,0,4],'plaster');const rng=random(712);
  const g=new T.PlaneGeometry(1000,1000,100,100);g.rotateX(-Math.PI/2);const p=g.getAttribute('position');const cols:number[]=[];
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);const y=Math.max(0,Math.hypot(x,z)-170)*.045*(1+Math.sin(x*.03)*.3);p.setY(i,y-.2);const c=new T.Color(i%4?'#7f9256':'#8b9b61');cols.push(c.r,c.g,c.b);}g.computeVertexNormals();
  b.add(g,'#81945c',[0,0,0],[1,1,1],[0,0,0],'grass');g.dispose();
  for(let row=-3;row<=3;row++)for(let col=-4;col<=4;col++){
    const x=col*35,z=row*42;if(Math.abs(x)<25)continue;
    b.box([x,-.04,z],[29,.12,35],(row+col)%3?'#a3a35c':'#8a9149',[0,0,0],'earth');
    for(let k=-4;k<=4;k++)b.box([x+k*3,.04,z],[.65,.09,32],(row+col)%3?'#b7ad67':'#687d45');
  }
  for(let i=0;i<13;i++){
    const x=i%2?24:-24,z=(i-6)*24;b.building(x,0,z,13,12,4.5,'#b7a98c','pitched');
    if(i%3===0)b.building(x*2,0,z+4,18,10,5,'#968b74','pitched');
  }
  for(let i=0;i<100;i++){const a=rng()*Math.PI*2,r=180+rng()*180;b.tree(Math.sin(a)*r,Math.max(0,r-170)*.045,Math.cos(a)*r,8+rng()*6,true);}
  b.path('village-lane',[[0,.2,-180],[0,.2,180]],7,'Walking between the farms','#a9a07e');
  for(let i=-3;i<=3;i++)b.path(`field-path-${i}`,[[-155,.2,i*42+20],[155,.2,i*42+20]],3,'Tending the fields','#96966b');
  b.routes.push({id:'grazing',points:[[80,.3,168],[135,.3,180],[156,.3,151],[91,.3,152],[80,.3,168]],activity:'Grazing',species:'goat'});
  mountains(b,15,610,400,112);
  return {id:'shinovar',group:b.finish('Shinovar_v2'),routes:b.routes,overview:{eye:[400,280,460],target:[0,0,0]},close:{eye:[1.8,3.2,38],target:[-5,2,-6]},radius:740,features:['Soil and ordinary grass','Earth-built houses','Sheltering mountains']};
}
export function buildPurelake():PlaceModel{
  const b=new ModelBuilder();const rng=random(626);
  b.box([0,-1.5,0],[20000,2,20000],'#a4a27c',[0,0,0],'earth');
  for(let i=0;i<28;i++){
    const a=i/28*Math.PI*2,r=80+rng()*80;const x=Math.sin(a)*r,z=Math.cos(a)*r;
    if(i%3===0)b.rock(x,-.5,z,8,4,11,'#909784',i);
    else{b.box([x,.5,z],[14,1.5,14],'#b7ac8e');b.building(x,1.25,z,9,9,4,'#c6b994');}
  }
  for(let i=-3;i<=3;i++)b.routes.push({id:`wading-${i}`,points:[[-65,-.15,i*12],[65,-.15,i*12]],activity:'Wading and fishing',species:'human'});
  b.box([0,.6,-65],[110,1,6],palette.wood);
  for(let i=-5;i<=5;i++){b.cylinder([i*10,-.2,-65],.3,4,palette.wood);b.box([i*10,2,-65],[1,1,1],palette.wood);}
  b.path('lake-walkway',[[-50,1.15,-65],[50,1.15,-65]],3,'Mending fishing nets',palette.wood);
  return {id:'purelake',group:b.finish('Purelake_v2'),routes:b.routes,overview:{eye:[285,150,325],target:[0,0,0]},close:{eye:[-5,3.1,23],target:[-18,1.7,5]},radius:650,water:{y:.45,size:20000,shallow:true},features:['Shallow inland water','Wading settlement','Stone outcrops']};
}
export function buildAkinah():PlaceModel{
  const b=new ModelBuilder();const rng=random(510);
  b.cylinder([0,-12,0],245,24,'#74776b');
  // Ten petal-shaped sectors are directly attested in the published Four Cities diagram.
  b.cylinder([0,1,0],28,2,'#b8af91');
  for(let petal=0;petal<10;petal++){
    const a=petal/10*Math.PI*2;const center:V3=[Math.sin(a)*131,0,Math.cos(a)*131];
    const shape=new T.Shape();shape.moveTo(-15,-65);shape.lineTo(-36,7);shape.lineTo(-27,58);shape.lineTo(0,72);shape.lineTo(27,58);shape.lineTo(36,7);shape.lineTo(15,-65);shape.closePath();
    const g=new T.ExtrudeGeometry(shape,{depth:3,bevelEnabled:false});g.rotateX(-Math.PI/2);b.add(g,'#a29c85',center,[1,1,1],[0,a,0]);g.dispose();
    for(let j=0;j<11;j++){
      if(j%3===1)continue;
      const rr=80+Math.floor(j/3)*27,side=((j%3)-1)*15;const x=Math.sin(a)*rr+Math.cos(a)*side,z=Math.cos(a)*rr-Math.sin(a)*side;
      ruinedHouse(b,x,3,z,10,8,5+rng()*7,a);
      stoneColumn(b,[x+4,3,z],4+rng()*5,.62,true);
      if(j%3===0)b.rock(x-4,3,z,3,2,3,'#717d64',j);
    }
    b.routes.push({id:`petal-${petal}`,points:[[Math.sin(a)*46,3,Math.cos(a)*46],[Math.sin(a)*209,3,Math.cos(a)*209]],activity:'Scavenging among the ruins',species:'cremling'});
  }
  for(let i=0;i<72;i++){const a=i/72*Math.PI*2;b.cone([Math.sin(a)*252,5,Math.cos(a)*252],3,12,'#777e73');}
  for(let i=0;i<12;i++)b.rock((rng()-.5)*55,0,(rng()-.5)*55,7,20+rng()*30,8,'#4c5753',i);
  // The real Oathgate is subterranean; no invented exposed active portal.
  return {id:'akinah',group:b.finish('Akinah_v2'),routes:b.routes,overview:{eye:[415,365,460],target:[0,0,0]},close:{eye:[4,5.5,190],target:[0,4.5,126]},radius:500,water:{y:-2,size:2000,shallow:false},features:['Tenfold flower plan','Stone spike defenses','Subterranean Oathgate omitted']};
}
