import {expect,it} from 'vitest';
import * as T from 'three';
import {cameraNear,enableLogDepth,atmosphereRange,preserveFogVisibility} from './renderPrecision';
import {refineTerrain,type Point2} from './terrainMesh';
it('keeps nearby geometry inside the frustum at city and continental distances',()=>{
  for(const distance of [.003,.01,.2,1,10,100,1000]){expect(cameraNear(distance)).toBeLessThan(distance*.01);expect(cameraNear(distance)).toBeLessThanOrEqual(.01);expect(cameraNear(distance)).toBeGreaterThan(0);}
});
it('uses a common depth encoding for custom water and particles',()=>{
  const material=new T.ShaderMaterial();enableLogDepth(material);
  const shader={vertexShader:'void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'void main(){gl_FragColor=vec4(1.);}',uniforms:{}};
  material.onBeforeCompile(shader as T.WebGLProgramParametersWithUniforms,{} as T.WebGLRenderer);
  expect(shader.vertexShader).toContain('#include <logdepthbuf_vertex>');expect(shader.fragmentShader).toContain('#include <logdepthbuf_fragment>');
});
it('refinement keeps all interior edges paired after displacing the surface',()=>{
  const points:Point2[]=[[0,0],[7,0],[7,3],[0,3]];
  const mesh=refineTerrain(points,[[0,1,2],[0,2,3]],.7),edges=new Map<string,number>();
  for(const face of mesh.faces)for(let i=0;i<3;i++){const a=face[i],b=face[(i+1)%3],key=a<b?`${a}:${b}`:`${b}:${a}`;edges.set(key,(edges.get(key)??0)+1);}
  for(const [key,count] of edges){const [a,b]=key.split(':').map(Number),p=mesh.points[a],q=mesh.points[b];expect(Math.hypot(p[0]-q[0],p[1]-q[1])).toBeLessThanOrEqual(.700001);if(count===1)expect(p[0]===q[0]&&(p[0]===0||p[0]===7)||p[1]===q[1]&&(p[1]===0||p[1]===3)).toBe(true);else expect(count).toBe(2);}
});

it('carves a shared boundary with no overlapping land and regional triangles',async()=>{
  const {joinTerrain,TERRAIN_RADIUS}=await import('./terrainJoin');
  const g=new T.BufferGeometry();const positions=[-4,-.8,-4,4,0,-4,4,.8,4,-4,-.8,-4,4,.8,4,-4,0,4];g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(positions.map(()=>.5),3));g.computeVertexNormals();
  const joined=joinTerrain(g,[{id:'test',radius:1,scale:1,origin:[0,0,0]}]),p=joined.geometry.getAttribute('position');
  for(let i=0;i<p.count;i+=3){const x=(p.getX(i)+p.getX(i+1)+p.getX(i+2))/3,z=(p.getZ(i)+p.getZ(i+1)+p.getZ(i+2))/3;expect(Math.hypot(x,z)).toBeGreaterThan(TERRAIN_RADIUS*Math.cos(Math.PI/144)-1e-6);}
  const boundary=joined.boundaries.get('test')!;expect(boundary.length).toBeGreaterThanOrEqual(144);
  for(const edge of boundary){expect(edge.y).toBeDefined();expect(edge.y).toBeCloseTo((edge.x+edge.z)*.1,6);}
  joined.geometry.dispose();g.dispose();
});

it('Revolar hills face the light rather than self-shadowing from inverted normals',async()=>{
  const {buildRevolar}=await import('./models/expandedCities');const {disposePlace}=await import('./models');const model=buildRevolar();let groundSamples=0;
  model.group.traverse(o=>{if(!(o instanceof T.Mesh))return;const p=o.geometry.getAttribute('position'),n=o.geometry.getAttribute('normal');for(let i=0;i<p.count;i++)if(Math.hypot(p.getX(i),p.getZ(i))>470&&p.getY(i)<80){expect(n.getY(i)).toBeGreaterThan(.4);groundSamples++;}});
  expect(groundSamples).toBeGreaterThan(100);disposePlace(model);
});


it('keeps the destination clear throughout both map/city zoom thresholds',()=>{
  for(let distance=.003;distance<400;distance*=1.08){const range=atmosphereRange(distance);expect(range.near).toBeGreaterThan(distance);expect(range.far).toBeGreaterThan(range.near);}
  for(const threshold of [14,32]){const a=atmosphereRange(threshold-.001),b=atmosphereRange(threshold+.001);expect(b.near-a.near).toBeLessThan(.004);expect(b.far-a.far).toBeLessThan(.017);}
});

it('limits haze in standard and custom shaders without losing existing material hooks',()=>{
 for(const material of [new T.MeshStandardMaterial(),new T.ShaderMaterial()]){
  material.onBeforeCompile=shader=>{shader.vertexShader+='\n// city clipping';};
  if(material instanceof T.ShaderMaterial)enableLogDepth(material);
  preserveFogVisibility(material);
  const shader={vertexShader:'void main(){gl_Position=vec4(1.);}',fragmentShader:'void main(){\n#include <fog_fragment>\n}',uniforms:{}};
  material.onBeforeCompile(shader as T.WebGLProgramParametersWithUniforms,{} as T.WebGLRenderer);
  expect(shader.fragmentShader).toContain('min(fogFactor, 0.32)');
  expect(shader.vertexShader).toContain('// city clipping');
  if(material instanceof T.ShaderMaterial)expect(shader.fragmentShader).toContain('#include <logdepthbuf_fragment>');
 }
});
it('keeps local storm views legible and transitions smoothly to the distant wall',async()=>{
 const {stormOpacityLimit}=await import('./storm');
 const inside={x:0,y:10,z:0},outside={x:-30,y:40,z:0};
 expect(stormOpacityLimit(inside,100)).toBeCloseTo(.48);
 expect(stormOpacityLimit(outside,10)).toBeCloseTo(.48);
 expect(stormOpacityLimit(outside,100)).toBeCloseTo(.98);
 for(let d=1;d<100;d+=.1)expect(Math.abs(stormOpacityLimit(outside,d+.1)-stormOpacityLimit(outside,d))).toBeLessThan(.002);
});
