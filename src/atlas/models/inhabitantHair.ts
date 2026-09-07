import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tube } from './organic';
import { peopleProfiles, type PersonAppearance } from './peopleProfiles';
import type { V3 } from './kit';

const noise=(n:number)=>T.MathUtils.euclideanModulo(Math.sin(n*127.1+31.7)*43758.5453,1);

/** A swept, shallow ribbon: several fine fibers share a flowing lock, while
 * its silhouette tapers independently. UV.y follows the root-to-tip direction. */
function ribbon(points:V3[],width:number,seed:number){
  const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),rows=26,cols=4;
  const positions:number[]=[],uv:number[]=[],indices:number[]=[];
  for(let i=0;i<=rows;i++){
    const t=i/rows,p=curve.getPoint(t),tangent=curve.getTangent(t);
    const across=new T.Vector3(1,0,0).addScaledVector(tangent,-tangent.x).normalize();
    const normal=new T.Vector3().crossVectors(across,tangent).normalize();
    const taper=(.84+.16*Math.sin(t*Math.PI))*(1-T.MathUtils.smoothstep(t,.7,1)*.97);
    for(let j=0;j<=cols;j++){
      const u=j/cols,x=(u*2-1),v=p.clone().addScaledVector(across,x*width*taper);
      v.addScaledVector(normal,(1-x*x)*width*.22+Math.sin(t*21+seed)*.00035);
      positions.push(...v.toArray());uv.push(u,t);
      if(i<rows&&j<cols){const k=i*(cols+1)+j,n=k+cols+1;indices.push(k,k+1,n,k+1,n+1,n);}
    }
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}

function hairMaterial(color:string){
  const m=new T.MeshPhysicalMaterial({color,roughness:.72,specularIntensity:.14,side:T.DoubleSide,alphaTest:.42,anisotropy:0,anisotropyRotation:Math.PI/2});
  if(new T.Color(color).getHSL({h:0,s:0,l:0}).l>.45)m.color.multiplyScalar(.6);
  m.userData.surface='hair';
  m.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec2 vStrandUv;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvStrandUv=uv;');
    shader.fragmentShader='varying vec2 vStrandUv;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float u=vStrandUv.x,v=vStrandUv.y;
      float fiber=sin(u*147.+sin(v*17.)*.35)*.5+.5;
      float fine=sin(u*431.+sin(v*31.)*.6)*.5+.5;
      diffuseColor.rgb*=.64+.25*fiber+.20*fine;
      float feather=smoothstep(0.,.12,u)*smoothstep(0.,.12,1.-u);
      diffuseColor.a*=feather*smoothstep(0.,.035,v)*(1.-smoothstep(.84+.13*fiber,1.,v));
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor+=.12*(1.-fiber);');
  };
  m.customProgramCacheKey=()=> 'flowing-hair-fibers-v1';return m;
}

/** Rooted layers sweep away from a softly irregular hairline, with independent
 * temple locks, nape volume and fine flyaways. All coordinates are head-local. */
export function createInhabitantHair(look:PersonAppearance){
  const style=peopleProfiles[look.culture].hairStyle,long=style==='long'||look.sex==='female',braid=style==='braids';
  const short=style==='short'&&!long,geometries:T.BufferGeometry[]=[],flyaways:T.BufferGeometry[]=[];
  const root=new T.Group();root.name=`${style}_layered_hair`;root.userData.anatomicalDetail=true;
  root.scale.x=look.culture==='singer'?1.13:look.culture==='aimian'?.9:1;
  for(let layer=0;layer<2;layer++)for(let i=0;i<46;i++){
    const q=(i+.35*layer)/45*2-1,s=T.MathUtils.clamp(q,-1,1),r=noise(i+layer*63+look.variant),a=Math.abs(s);
    const x=s*.09,lift=layer*.004;
    const points:V3[]=[
      [x,.221-.045*a*a+(r-.5)*.005,.114-.032*a*a],
      [x*.97-.008,.264-.030*a+lift,.075-.012*a],
      [x*.99-.012,.287-.055*a+lift,.006],
      [x*.93,.228-.048*a,-.098+lift],
      [x*.88+(r-.5)*.012,short?.156:long?-.08-r*.07:.097+r*.024,-.089+ (long?.027:0)],
    ];
    if(braid)points[4]=[x*.75,.106,-.093];
    if(style==='waves'){points[1][0]+=Math.sin(s*5)*.009;points[2][0]+=Math.sin(s*5+.8)*.008;}
    geometries.push(ribbon(points,.0045+r*.002,i));
    if(i%3===0){const thin=points.map((p,j)=>[p[0]+.002,p[1]+.0015+j*.0002,p[2]+.001] as V3);flyaways.push(tube(thin,[.00025,.00045,.0003,.00008],3,18));}
  }
  for(const side of [-1,1])for(let i=0;i<26;i++){
    const t=i/25,r=noise(i+120+side),x=side*(.083+.020*Math.sin(t*Math.PI/2));
    const points:V3[]=[
      [x,.202-t*.060,.078-t*.024],
      [side*.107,.227-t*.055,.033-t*.026],
      [side*.108,.194-t*.06,-.043],
      [side*(.087+r*.019),long?-.095-r*.075:.103-r*.035,-.068+r*.020],
    ];
    if(braid)points[3]=[side*.083,.074,-.076];
    geometries.push(ribbon(points,.0045+r*.002,i));
  }
  for(const side of [-1,1])for(let i=0;i<14;i++){
    const t=i/13;geometries.push(ribbon([[side*(.065+t*.013),.24-t*.032,.069-t*.006],[side*.084,.253-t*.038,.017],[side*.098,.20-t*.038,-.042],[side*.09,long?-.07:.12,-.073]],.0045,i));
  }
  if(braid)for(let i=0;i<11;i++){
    const x=(i-5)*.015;
    for(let strand=0;strand<3;strand++){
      const points:V3[]=[];
      for(let j=0;j<20;j++){const t=j/19,a=t*Math.PI*12+strand*Math.PI*2/3;points.push([x*.95+Math.cos(a)*.004*(1-t*.55),.195-t*(long?.39:.26),-.098+Math.sin(a)*.004]);}
      flyaways.push(tube(points,[.0032,.0030,.0018,.0004],5,38));
    }
  }
  // Fit the whole surface, not just its control points. A Catmull-Rom span can
  // bow through the crown even when every control point is outside the head.
  for(const g of [...geometries,...flyaways]){
    const p=g.getAttribute('position');
    for(let i=0;i<p.count;i++){
      let x=p.getX(i)*.88,y=p.getY(i),z=p.getZ(i)+.039;
      const radius=Math.hypot(x/.085,(y-.177)/(look.sex==='female'?.116:.108),(z-.045)/(look.sex==='female'?.117:.108));
      if(y>.11&&radius<1.045){const f=1.045/Math.max(radius,.001);x*=f;y=.177+(y-.177)*f;z=.045+(z-.045)*f;}
      p.setXYZ(i,x,y,z);
    }
    g.computeVertexNormals();
  }
  const g=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());
  const mesh=new T.Mesh(g!,hairMaterial(look.hair));mesh.name='swept_fiber_locks';mesh.castShadow=true;root.add(mesh);
  const fine=mergeGeometries(flyaways);flyaways.forEach(g=>g.dispose());
  const fibers=new T.Mesh(fine!,new T.MeshPhysicalMaterial({color:look.hair,roughness:.7,specularIntensity:.3}));fibers.name='individual_hair_and_braids';fibers.castShadow=true;root.add(fibers);
  return root;
}
