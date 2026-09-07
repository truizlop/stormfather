import {useMemo,useRef,useEffect} from 'react';
import {useFrame} from '@react-three/fiber';
import * as T from 'three';
import {useAtlas,worldClock} from './store';
import type {PlaceModel,V3} from './models/kit';

function Waterfalls(){
 const group=useRef<T.Group>(null);const uniforms=useMemo(()=>({uTime:{value:0}}),[]),mist=useRef<T.Points>(null);
 const geometry=useMemo(()=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(480*3),3));return g;},[]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 useFrame(()=>{group.current?.traverse(o=>{if(o instanceof T.Mesh&&o.material instanceof T.ShaderMaterial){o.material.uniforms.uTime.value=worldClock.time;if(o.material.uniforms.uWind)o.material.uniforms.uWind.value=.12+worldClock.storm*.5;}});if(mist.current){const p=geometry.getAttribute('position');for(let i=0;i<480;i++){const age=(worldClock.time*.12+i/240)%1,a=i*2.399,r=8+age*23;p.setXYZ(i,(i<240?-340:340)+Math.cos(a)*r,1+age*17,-94+Math.sin(a)*r);}p.needsUpdate=true;}});
 return <group ref={group} name="Rall_Elorim_waterfalls">{[-340,340].map((x,i)=><mesh key={x} position={[x,165,-94]}><planeGeometry args={[i?22:28,330,1,32]}/><shaderMaterial uniforms={uniforms} transparent depthWrite={false} side={T.DoubleSide} vertexShader={`varying vec2 vUv;uniform float uTime;void main(){vUv=uv;vec3 p=position;p.x+=sin(uv.y*15.+uTime*.5)*1.4*(1.-uv.y);p.z+=sin(uv.y*22.+uTime)*.7;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`} fragmentShader={`varying vec2 vUv;uniform float uTime;void main(){float strands=sin(vUv.x*77.+sin(vUv.y*8.-uTime*2.))*sin(vUv.y*140.+uTime*18.);float edge=smoothstep(0.,.2,vUv.x)*smoothstep(0.,.2,1.-vUv.x);float body=.55+strands*.2;gl_FragColor=vec4(mix(vec3(.54,.73,.73),vec3(.91,.96,.9),body),edge*(.6+body*.28));}`}/></mesh>)}<points ref={mist} geometry={geometry} frustumCulled={false}><shaderMaterial transparent depthWrite={false} vertexShader="varying float vFade;void main(){vFade=1.-position.y/22.;vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(4./max(.001,-p.z),1.,65.);}" fragmentShader="varying float vFade;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(.77,.86,.81,(1.-d)*(1.-d)*vFade*.19);}"/></points></group>;
}
export function CityAtmosphere({model}:{model:PlaceModel}){
 const group=useRef<T.Group>(null);const uniforms=useMemo(()=>({uTime:{value:0},uWind:{value:.12}}),[]);
 const sites=(model.group.userData.lampSites??[]) as V3[];
 useFrame(()=>{group.current?.traverse(o=>{if(o instanceof T.Mesh&&o.material instanceof T.ShaderMaterial){o.material.uniforms.uTime.value=worldClock.time;if(o.material.uniforms.uWind)o.material.uniforms.uWind.value=.12+worldClock.storm*.5;}});uniforms.uWind.value=.12+worldClock.storm*.5;
  const night=1-useAtlas.getState().daylight;model.group.traverse(o=>{if(o instanceof T.Mesh&&!Array.isArray(o.material)&&o.material instanceof T.MeshStandardMaterial){if(o.name.endsWith('_lamp'))o.material.emissiveIntensity=.7+night*2;if(o.name.endsWith('_window'))o.material.emissiveIntensity=night*.8;}});
 });
 return <group ref={group} name="City_atmosphere">{model.id==='rall-elorim'&&<Waterfalls/>}{sites.filter((_,i)=>i%3===0).map((p,i)=><mesh key={i} position={[p[0]-.37,p[1]+2.75,p[2]]}><planeGeometry args={[.7,1.25,8,16]}/><shaderMaterial uniforms={uniforms} side={T.DoubleSide} vertexShader="varying vec2 vUv;uniform float uTime,uWind;void main(){vUv=uv;vec3 p=position;float loose=(1.-uv.x);p.z+=sin(uv.y*7.+uv.x*4.-uTime*3.)*loose*uWind;p.y+=sin(uv.x*4.+uTime*2.)*.045*loose;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}" fragmentShader={`varying vec2 vUv;void main(){vec3 cloth=${i%2?'vec3(.37,.46,.43)':'vec3(.51,.31,.25)'};float border=step(.07,vUv.x)*step(vUv.x,.93)*step(.07,vUv.y)*step(vUv.y,.94);float glyph=1.-smoothstep(.01,.04,abs(length((vUv-.5)*vec2(1.,1.5))-.23));gl_FragColor=vec4(mix(vec3(.71,.61,.4),cloth,border)+glyph*.2,1.);}`}/></mesh>)}</group>;
}
