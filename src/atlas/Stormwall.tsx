import {useMemo,useRef,useEffect} from 'react';
import {useFrame} from '@react-three/fiber';
import {useFBO} from '@react-three/drei';
import * as T from 'three';
import {worldClock} from './store';
import {stormPosition,lightningPulse,stormOpacityLimit} from './storm';
import {random} from './models/kit';
const vertex=`varying vec3 vLocal;void main(){vLocal=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const noise=`
float hash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+1.),f.x),f.y),f.z);}
float fbm(vec3 p){return noise3(p)*.58+noise3(p*2.03+7.)*.28+noise3(p*4.11+13.)*.14;}
`;
const fragment=`varying vec3 vLocal;uniform vec3 uCamera;uniform float uTime,uOpacity,uStrength,uFlash,uBoltZ,uFar,uMaxOpacity;uniform sampler2D uSceneDepth;uniform vec2 uResolution;uniform mat4 uLocalToView;${noise}
float density(vec3 p){
 float zfade=1.-smoothstep(40.,53.,abs(p.z));
 float top=16.+sin(p.z*.12)*1.7+noise3(vec3(p.z*.19,0.,0.))*3.;
 float front=1.4*sin(p.z*.09)+pow(p.y/20.,2.)*7.;
 float roll=exp(-pow((p.x-front)/5.,2.))*(1.-smoothstep(top-2.,top+1.2,p.y));
 float shelf=smoothstep(0.,12.,p.x)*(1.-smoothstep(17.,27.,p.x))*exp(-pow((p.y-top+2.)/4.,2.));
 float billow=fbm(p*vec3(.37,.48,.24)+vec3(uTime*.085,-uTime*.055,0.));
 return max(0.,(max(roll,shelf)*1.12+billow*.6-.48))*zfade*smoothstep(0.,2.,p.y);
}
void main(){
 vec3 rd=normalize(vLocal-uCamera);vec3 inv=1./rd;
 vec3 a=(vec3(-11.,0.,-54.)-uCamera)*inv,b=(vec3(28.,23.,54.)-uCamera)*inv;
 vec3 lo=min(a,b),hi=max(a,b);float entry=max(0.,max(max(lo.x,lo.y),lo.z)),finish=min(min(hi.x,hi.y),hi.z);
 // The depth buffer uses the same logarithmic encoding as the main scene.
 // Stop at the first opaque surface, not the back of the cloud bounding box.
 float sceneDepth=texture2D(uSceneDepth,gl_FragCoord.xy/uResolution).r;
 float viewDepth=exp2(sceneDepth*log2(uFar+1.))-1.;
 float rayViewDepth=-(uLocalToView*vec4(rd,0.)).z;
 if(rayViewDepth>0.)finish=min(finish,viewDepth/rayViewDepth);
 if(finish<=entry)discard;
 float stride=(finish-entry)/40.;vec4 sum=vec4(0.);float jitter=hash(vec3(gl_FragCoord.xy,0.));
 for(int i=0;i<40;i++){vec3 p=uCamera+rd*(entry+(float(i)+jitter)*stride);float d=density(p);if(d>.015){
 float edge=clamp(d-density(p+vec3(-.8,1.1,.4)),0.,1.);
 vec3 c=mix(vec3(.037,.065,.10),vec3(.22,.31,.38),clamp(p.y/24.,0.,1.));c+=edge*vec3(.38,.43,.44);
 float lightning=exp(-length((p-vec3(1.,9.,uBoltZ))*vec3(.2,.16,.12)));c+=uFlash*lightning*vec3(.38,.67,.95);
 float alpha=(1.-exp(-d*stride*.52))*uOpacity;sum.rgb+=(1.-sum.a)*c*alpha;sum.a+=(1.-sum.a)*alpha;if(sum.a>.985)break;
 }}
 if(sum.a<.008)discard;gl_FragColor=vec4(sum.rgb/max(sum.a,.001),min(sum.a*uStrength,uMaxOpacity));
}`;
export function Stormwall(){
 const root=useRef<T.Group>(null),bolts=useRef<T.Group>(null),rain=useRef<T.LineSegments>(null),debris=useRef<T.InstancedMesh>(null);const reduced=useMemo(()=>typeof window!=='undefined'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches,[]);
 const dummy=useMemo(()=>new T.Object3D(),[]);
 const cloud=useRef<T.ShaderMaterial>(null);
 const sceneDepth=useFBO({depthBuffer:true,type:T.UnsignedByteType});
 const initialUniforms=useMemo(()=>({uCamera:{value:new T.Vector3()},uTime:{value:0},uOpacity:{value:0},uStrength:{value:1},uFlash:{value:0},uBoltZ:{value:0},uSceneDepth:{value:sceneDepth.depthTexture},uResolution:{value:new T.Vector2()},uLocalToView:{value:new T.Matrix4()},uFar:{value:2000},uMaxOpacity:{value:1}}),[sceneDepth.depthTexture]);
 const geometry=useMemo(()=>{const g=new T.BoxGeometry(39,23,108);g.translate(8.5,11.5,0);return g;},[]);
 const rainGeometry=useMemo(()=>{const r=random(326),p:number[]=[],base:number[]=[];for(let i=0;i<2000;i++){const x=r()*19-1,y=r()*14,z=(r()-.5)*96;p.push(x,y,z,x-.33,y-.85,z);base.push(y,y);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('aBase',new T.Float32BufferAttribute(base,1));return g;},[]);
 const boltGeometry=useMemo(()=>{const r=random(414),g=new T.BufferGeometry(),p:number[]=[];let x=0,z=0;for(let j=0;j<18;j++){const nx=x+(r()-.5)*2,nz=z+(r()-.5)*1.5,y=14-j*.77;p.push(x,y,z,nx,y-.77,nz);if(j%4===0)p.push(nx,y-.77,nz,nx+(r()-.5)*4,y-2.6,nz+2);x=nx;z=nz;}g.setAttribute('position',new T.Float32BufferAttribute(p,3));return g;},[]);
 useEffect(()=>()=>{geometry.dispose();rainGeometry.dispose();boltGeometry.dispose();},[geometry,rainGeometry,boltGeometry]);
 useFrame(({camera,gl,scene,controls})=>{if(!root.current||!cloud.current){gl.render(scene,camera);return;}const uniforms=cloud.current.uniforms as typeof initialUniforms;const s=stormPosition(worldClock.stormTime),o=worldClock.storm;root.current.visible=o>.01;root.current.position.x=s.x;root.current.scale.y=s.strength;
 root.current.updateMatrixWorld(true);camera.updateMatrixWorld();
 uniforms.uCamera.value.copy(camera.position);root.current.worldToLocal(uniforms.uCamera.value);
 uniforms.uLocalToView.value.multiplyMatrices(camera.matrixWorldInverse,root.current.matrixWorld);
 gl.getDrawingBufferSize(uniforms.uResolution.value);uniforms.uFar.value=(camera as T.PerspectiveCamera).far;
 // Preserve local navigation when the camera flies into the cloud volume.
 const focus=(controls as {target?:T.Vector3}|null)?.target;
 uniforms.uMaxOpacity.value=stormOpacityLimit(uniforms.uCamera.value,focus?camera.position.distanceTo(focus):100);
 uniforms.uTime.value=reduced?0:worldClock.time;uniforms.uOpacity.value=o;uniforms.uStrength.value=Math.min(1,s.strength+.25);uniforms.uFlash.value=lightningPulse(worldClock.stormTime,reduced);uniforms.uBoltZ.value=Math.sin(Math.floor(worldClock.stormTime/8)*8.91)*35;
 if(bolts.current){bolts.current.position.set(-1.8,0,uniforms.uBoltZ.value);bolts.current.visible=uniforms.uFlash.value>.08;bolts.current.children.forEach(c=>{((c as T.Line).material as T.LineBasicMaterial).opacity=uniforms.uFlash.value*o;});}
 if(debris.current){for(let i=0;i<160;i++){const t=reduced?0:worldClock.time,phase=(t*.16+i*.618)%1,a=i*2.399;dummy.position.set(-2+Math.cos(a+t)*phase*3,1+Math.sin(phase*Math.PI)*2.8,(i/160-.5)*85);dummy.rotation.set(t+i,t*1.3+i,0);dummy.scale.setScalar(.025+(i%7)*.009);dummy.updateMatrix();debris.current.setMatrixAt(i,dummy.matrix);}debris.current.instanceMatrix.needsUpdate=true;}
 if(rain.current){const m=rain.current.material as T.ShaderMaterial;m.uniforms.uTime.value=reduced?0:worldClock.time;m.uniforms.uOpacity.value=o;}
 if(root.current.visible){
   const previousTarget=gl.getRenderTarget();root.current.visible=false;
   try{gl.setRenderTarget(sceneDepth);gl.render(scene,camera);}
   finally{gl.setRenderTarget(previousTarget);root.current.visible=true;}
 }
 gl.render(scene,camera);
 },1);
 return <group ref={root} name="Highstorm_stormwall"><mesh geometry={geometry} renderOrder={5}><shaderMaterial ref={cloud} key={fragment} uniforms={initialUniforms} vertexShader={vertex} fragmentShader={fragment} transparent depthWrite={false} depthTest={false} side={T.BackSide}/></mesh>
 <lineSegments ref={rain} geometry={rainGeometry} renderOrder={4}><shaderMaterial uniforms={{uTime:{value:0},uOpacity:{value:0}}} transparent depthWrite={false} vertexShader={`uniform float uTime;attribute float aBase;varying float vY;void main(){vec3 p=position;p.y=mod(aBase-uTime*8.+10000.,14.)+position.y-aBase;p.x-=mod(uTime*2.,1.);vY=p.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`} fragmentShader="uniform float uOpacity;varying float vY;void main(){gl_FragColor=vec4(.49,.66,.72,uOpacity*.15*smoothstep(0.,2.,vY));}"/></lineSegments>
 <instancedMesh ref={debris} args={[undefined,undefined,160]} frustumCulled={false}><dodecahedronGeometry args={[1,0]}/><meshStandardMaterial color="#747665" roughness={1}/></instancedMesh>
 <group ref={bolts} renderOrder={6}><lineSegments geometry={boltGeometry}><lineBasicMaterial color="#c4edff" transparent depthWrite={false} toneMapped={false}/></lineSegments></group>
 <mesh position={[8,.3,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[45,105]}/><shaderMaterial transparent depthWrite={false} vertexShader="varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}" fragmentShader="varying vec2 vUv;void main(){float a=sin(vUv.x*3.14159)*sin(vUv.y*3.14159);gl_FragColor=vec4(.02,.055,.07,a*.3);}"/></mesh>
 </group>;
}
