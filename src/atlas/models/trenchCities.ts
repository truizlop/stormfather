import * as T from 'three';
import {cropPlot} from './nature';
import {ModelBuilder,random,palette,type PlaceModel,type V3} from './kit';
/** Geometry follows the described topology. Individual cuts/buildings are interpreted. */
export function buildYeddaw():PlaceModel{
  const b=new ModelBuilder([383,0,9]),rng=random(615);
  b.cylinder([0,-6,0],460,10,'#a29479');
  // A continuous spiral trench between broad, farmed banks.
  const steps=320,turns=3.3;const path:V3[]=[];
  for(let i=0;i<=steps;i++){
    const a=i/steps*Math.PI*2*turns,r=76+i/steps*338,y=7*(1-i/steps);
    path.push([Math.cos(a)*r,y+.15,Math.sin(a)*r]);
    if(i===steps)continue;
    const aa=(i+.5)/steps*Math.PI*2*turns,rr=76+(i+.5)/steps*338;
    const tangent=aa+Math.PI/2,span=rr*Math.PI*2*turns/steps*1.025;
    // Crop plots sit on the continuous upper ground, between the cuts.
    if(i%10===0)cropPlot(b,[Math.cos(aa)*(rr+51),38.2,Math.sin(aa)*(rr+51)],14,14,i,false);
    if(i%5===0){b.box([Math.cos(aa)*(rr+51),38.1,Math.sin(aa)*(rr+51)],[58,.12,span*4.8],i%10?'#859461':'#98a071',[0,-aa,0]);for(let row=-3;row<=3;row++)b.box([Math.cos(aa)*(rr+51+row*7),38.2,Math.sin(aa)*(rr+51+row*7)],[.6,.2,span*4.7],'#647b4e',[0,-aa,0]);}
    if(i%2===0)for(const side of [-1,1]){
      const x=Math.cos(a)*(r+side*10),z=Math.sin(a)*(r+side*10);
      const house=new ModelBuilder([383-x,0,9-z]);house.building(0,y,0,8,6,10+rng()*7,['#c0aa83','#a87b5f','#bec0a5','#a7aa93'][i%4]);const g=house.finish('trench_dwelling');g.position.set(x,0,z);g.rotation.y=-tangent+(side<0?Math.PI:0);
      g.updateMatrixWorld(true);g.traverse(o=>{if(o instanceof T.Mesh){const geometry=o.geometry.clone();geometry.applyMatrix4(o.matrixWorld);const surface=(o.material as T.MeshStandardMaterial).userData.surface??'stone',bucket=b.buckets.get(surface)??[];bucket.push(geometry);b.buckets.set(surface,bucket);o.geometry.dispose();(o.material as T.Material).dispose();}});
    }
    if(i%16===0){const x=Math.cos(a)*r,z=Math.sin(a)*r; b.beam([x,y,z],[x,y+4,z],.14,palette.wood);b.sphere([x,y+4,z],[.35,.5,.35],'#f3d89f','window');}
  }
  // One continuous ground mass with a real spiral-shaped hole, not separate bars.
  const upper=new T.Shape();upper.absarc(0,0,530,0,Math.PI*2,false);
  const trench:T.Vector2[]=[];const floor:number[]=[];
  for(let i=0;i<=steps;i++){const a=i/steps*Math.PI*2*turns,r=76+i/steps*338;trench.push(new T.Vector2(Math.cos(a)*(r-17),-Math.sin(a)*(r-17)));}
  for(let i=steps;i>=0;i--){const a=i/steps*Math.PI*2*turns,r=76+i/steps*338;trench.push(new T.Vector2(Math.cos(a)*(r+17),-Math.sin(a)*(r+17)));}
  upper.holes.push(new T.Path(trench));const center=new T.Path();center.absarc(0,0,58,0,Math.PI*2,true);upper.holes.push(center);
  const bulk=new T.ExtrudeGeometry(upper,{depth:42,bevelEnabled:false,curveSegments:96});bulk.rotateX(-Math.PI/2);b.add(bulk,'#a69b7e',[0,-4,0],[1,1,1],[0,0,0],'rock');bulk.dispose();
  const fields=new T.ShapeGeometry(upper,96);fields.rotateX(-Math.PI/2);b.add(fields,'#83915e',[0,38.04,0],[1,1,1],[0,0,0],'grass');fields.dispose();
  for(let i=0;i<steps;i++){
    const ends=[i,i+1].map(j=>{const a=j/steps*Math.PI*2*turns,r=76+j/steps*338,y=7*(1-j/steps);return [ [Math.cos(a)*(r-17),y,Math.sin(a)*(r-17)], [Math.cos(a)*(r+17),y,Math.sin(a)*(r+17)] ];});
    for(const p of [ends[0][0],ends[1][0],ends[0][1],ends[0][1],ends[1][0],ends[1][1]])floor.push(...p);
  }
  const street=new T.BufferGeometry();street.setAttribute('position',new T.Float32BufferAttribute(floor,3));street.computeVertexNormals();b.add(street,'#b2a387',[0,.04,0],[1,1,1],[0,0,0],'paving');street.dispose();
  b.cylinder([0,3,0],58,8,'#b2a387');
  // The Grand Indicium is the central mound above the surrounding ground.
  b.cylinder([0,16,0],53,43,'#b7a98c');b.sphere([0,37,0],[54,16,54],'#c7bda4');
  for(let i=0;i<24;i++){const a=i/24*Math.PI*2;b.box([Math.sin(a)*52,28,Math.cos(a)*52],[3,12,1],palette.window,[0,a,0],'window');}
  for(let i=0;i<6;i++){const from=i*48;const segment=path.slice(from,from+42);b.path(`spiral-quarter-${i}`,segment,5,'Walking the sunken spiral','#b3a38b');}
  b.path('pancake-lane',[[383,.8,-14],[383,.8,14]],5,'Visiting the Sun Day cake stalls','#b3a38b');
  b.box([394,3.8,0],[3.4,.12,2.3],'#b58a52');for(const x of [-1.5,1.5])for(const z of [-.95,.95])b.box([394+x,2.3,z],[.12,3,.12],palette.wood);
  return {id:'yeddaw',group:b.finish('Yeddaw_v2'),routes:b.routes,radius:580,overview:{eye:[730,510,760],target:[0,12,0]},close:{eye:[383,7,-14],target:[383,2,9]},features:['Sunken spiral trenches','Farmland above the streets','Moundlike Grand Indicium']};
}
export function buildSesemalex():PlaceModel{
  const b=new ModelBuilder([0,0,220],'ashlar'),rng=random(768);
  b.box([0,-7,0],[820,12,820],'#938872');
  for(let cut=-3;cut<=3;cut++){
    const x=cut*105,length=580-Math.abs(cut)*65;
    for(const side of [-1,1]){
      b.box([x+side*36,13,0],[29,40,length+60],'#9c987f');
      for(let z=-length/2;z<length/2;z+=22){
        b.building(x+side*15,0,z,9,14,9+rng()*12,['#b4a788','#b19b79','#899b8e'][Math.abs(cut)%3]);
        b.box([x+side*34,34,z],[31,.5,19],'#9ca17c',[0,0,0],'grass');if(Math.abs(cut)<2&&z>80&&z<240)cropPlot(b,[x+side*34,34.26,z],19,14,Math.round(z)+400,false);
      }
    }
    b.path(`trough-${cut}`,[[x,.15,-length/2],[x,.15,length/2]],6,'Following the sheltered trough','#b2aa8c');
    // Lids bridge selected sections; drains remain open down the center.
    for(let z=-length/2+50;z<length/2;z+=110){
      b.box([x,34,z],[48,1.3,22],'#b1aa91');
      for(let j=-3;j<=3;j++)b.box([x+j*6,35,z],[.25,.9,23],palette.dark);
    }
    b.box([x,-.01,0],[.9,.12,length],'#63827c');
  }
  b.path('southern-concourse',[[-330,.15,315],[330,.15,315]],9,'Trading along the southern concourse','#b2aa8c');
  for(let i=-5;i<=5;i++)b.stall(i*46,.1,324,i%2?'#8b6f91':'#ba814d');
  return {id:'sesemalex-dar',group:b.finish('Sesemalex_Dar_v2'),routes:b.routes,radius:540,overview:{eye:[610,470,670],target:[0,15,0]},close:{eye:[0,9,170],target:[0,3,220]},features:['Long sunken troughs','Partial protective lids','Open drainage channels']};
}
