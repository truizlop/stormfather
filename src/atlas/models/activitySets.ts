import * as T from 'three';
import {ModelBuilder,type V3,palette} from './kit';
export const VILLAGE_CENTER:V3=[-466,.1,-330];
export const listenerHomes=Array.from({length:12},(_,i)=>{const a=i/12*Math.PI*2;return [Math.sin(a)*27,0,Math.cos(a)*27] as V3;});
export function addPlainsActivities(b:ModelBuilder){
  // An authored western crossing: 4.4 m gap, compatible with a 30-foot bridge.
  for(const [x,width] of [[-498.6,50.8],[-440.4,56.8]]){
    b.box([x,-22,299],[width,44,65],'#998269');
    for(let line=0;line<4;line++)b.box([x,-6-line*9,331.6],[width,.15,.2],'#bd9d76');
  }
  // The book's hunting parties use an open plateau, where the greatshell can be lured into view.
  const huntOutline=new T.Shape([[-364,-446],[-319,-431],[-246,-444],[-171,-456],[-150,-506],[-173,-566],[-255,-581],[-339,-563],[-369,-507]].map(([x,z])=>new T.Vector2(x,z)));
  const huntGround=new T.ExtrudeGeometry(huntOutline,{depth:46,bevelEnabled:false});huntGround.rotateX(-Math.PI/2);b.add(huntGround,'#a38b6e',[0,-46,0]);huntGround.dispose();
  const [vx,,vz]=VILLAGE_CENTER;
  b.cylinder([vx,-22,vz],64,44,'#978773');
  for(let i=0;i<14;i++){const a=i/14*Math.PI*2;b.rock(vx+Math.sin(a)*60,-7,vz+Math.cos(a)*60,8,12,8,'#8f806c',i);}
  // Tall stone on the eastern, windward side; homes gather to its west.
  b.rock(vx+42,0,vz,14,35,27,'#847e70',31);
  listenerHomes.forEach(([x,,z],i)=>{
    b.sphere([vx+x,1.4,vz+z],[4.8,3.2+(i%3)*.35,4.6+(i%2)*.35],i%2?'#baa58b':'#a5907c');
    // Shell frame ribs show through the hardened crem skin.
    for(let rib=-1;rib<=1;rib++){
      const pts:V3[]=[];for(let j=0;j<=12;j++){const a=j/12*Math.PI;pts.push([vx+x+rib*1.2,1.1+Math.sin(a)*3.9,vz+z+Math.cos(a)*4.7]);}
      for(let j=1;j<pts.length;j++)b.beam(pts[j-1],pts[j],.09,'#dbc5a4');
    }
    b.box([vx+x-4.65,1.15,vz+z],[.14,2.3,1.65],'#302e29');
    for(const side of [-1,1])b.beam([vx+x-4.8,.12,vz+z+side*.9],[vx+x-4.8,2.4,vz+z+side*.8],.12,'#d1bb9b');
    b.beam([vx+x-4.8,2.4,vz+z-.8],[vx+x-4.8,2.4,vz+z+.8],.15,'#d1bb9b');
    for(let jar=0;jar<3;jar++){b.sphere([vx+x-5.2,.45,vz+z+2.2+jar*.8],[.35,.46,.35],jar%2?'#9d8063':'#b59674');b.cylinder([vx+x-5.2,.82,vz+z+2.2+jar*.8],.18,.18,'#8e725a');}
    b.box([vx+x-5.1,.07,vz+z],[1.3,.14,2.1],'#ccb18c');
    b.sphere([vx+x-5.5,.45,vz+z+2],[.65,.45,.55],'#807452');
  });
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2;b.sphere([vx+Math.sin(a)*1.7,.2,vz+Math.cos(a)*1.7],[.5,.32,.5],'#7b756b');}
  b.box([vx+11,.65,vz-4],[3,1.3,1.8],palette.wood);
  for(let i=0;i<9;i++){const a=i*2.399;b.sphere([vx+11+Math.sin(a),1.42,vz-4+Math.cos(a)*.5],[.27,.17,.35],'#ad9a74');}
  for(let i=0;i<8;i++)b.beam([vx+Math.sin(i)*1.1,.15,vz+Math.cos(i)*1.1],[vx-Math.sin(i)*.8,.22,vz-Math.cos(i)*.8],.13,'#705541');b.box([vx-9,.4,vz+12],[3.4,.8,2.2],'#968b6d');
}
export function buildBridge(){
  const b=new ModelBuilder();
  for(const side of [-1,1])b.box([0,.23,side*.99],[9.14,.46,.29],'#5d4030');
  for(let i=0;i<31;i++){
    b.box([(i-15)*.295,.53,0],[.27,.16,2.44],i%3?'#a18861':'#88704f');
    for(const side of [-1,1])b.sphere([(i-15)*.295,.615,side*.9],[.024,.01,.024],'#574b3d','metal');
  }
  for(let i=0;i<8;i++)b.box([-3.5+i,.17,0],[.16,.3,4.88],'#765b3e');
  const g=b.finish('Thirty_foot_carried_bridge');g.userData={length:9.14,deckWidth:2.44,supportWidth:4.88,crew:40};return g;
}
