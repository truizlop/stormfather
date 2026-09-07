import * as T from 'three';

let source: {geometry:T.BufferGeometry;color:T.Texture;normal:T.Texture;original:T.BufferGeometry}|null=null;
const waiting=new Set<WeakRef<T.Group>>();

export function installHeadAssets(original:T.BufferGeometry,color:T.Texture,normal:T.Texture){
  if(source?.original===original)return;
  const geometry=original.clone(),position=geometry.getAttribute('position');
  const originalIndex=geometry.index!,indices:number[]=[];
  // Crop the scan's shoulders at the neck before normalizing to human metres.
  for(let i=0;i<originalIndex.count;i+=3){const a=originalIndex.getX(i),b=originalIndex.getX(i+1),c=originalIndex.getX(i+2);if(Math.min(position.getY(a),position.getY(b),position.getY(c))> -1.05)indices.push(a,b,c);}
  geometry.setIndex(indices);geometry.scale(.053,.052,.05);geometry.translate(.003,-.028,-.02);geometry.computeBoundingSphere();
  source?.geometry.dispose();source={geometry,color,normal,original};
  for(const ref of waiting){const head=ref.deref();if(head)applyHead(head);}waiting.clear();
}
export function registerHead(head:T.Group,listener:boolean,skin:string,hair:string){
  head.userData.portrait={listener,skin,hair};
  if(source)applyHead(head);else waiting.add(new WeakRef(head));
}
function applyHead(head:T.Group){
  if(!source||head.userData.scanInstalled)return;head.userData.scanInstalled=true;
  const {listener,skin,hair}=head.userData.portrait;
  for(const object of [...head.children]){
    if(!(object instanceof T.Mesh))continue;
    const material=object.material as T.MeshStandardMaterial;
    if(['skin','eye',...(!listener?['hair']:[])].includes(material.userData.surface)) {head.remove(object);object.geometry.dispose();material.dispose();}
  }
  const geometry=source.geometry.clone();
  const material=new T.MeshStandardMaterial({map:source.color,normalMap:source.normal,normalScale:new T.Vector2(.58,.58),roughness:.72,color:listener?'#ab9995':new T.Color(skin).lerp(new T.Color('#ffffff'),.48)});
  if(listener){
    material.onBeforeCompile=shader=>{
      shader.vertexShader='varying vec3 vMarblePosition;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvMarblePosition=position;');
      shader.fragmentShader='varying vec3 vMarblePosition;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        float marble=sin(vMarblePosition.x*68.+sin(vMarblePosition.y*44.)*2.+sin(vMarblePosition.z*85.));
        diffuseColor.rgb*=mix(vec3(.23,.24,.25),vec3(.82,.35,.29),smoothstep(-.25,.2,marble));
      `);
    };
    material.customProgramCacheKey=()=> 'listener-scan-marbling-v1';
  }
  const mesh=new T.Mesh(geometry,material);mesh.name='scanned_facial_anatomy';mesh.castShadow=mesh.receiveShadow=true;head.add(mesh);
  if(!listener){
    const scalp=geometry.clone(),p=scalp.getAttribute('position'),n=scalp.getAttribute('normal');
    for(let i=0;i<p.count;i++)p.setXYZ(i,p.getX(i)+n.getX(i)*.0012,p.getY(i)+n.getY(i)*.0012,p.getZ(i)+n.getZ(i)*.0012);
    const hairMaterial=new T.MeshStandardMaterial({color:hair,roughness:.92});
    // A continuous hairline follows the scan instead of exposing a sawtoothed
    // boundary along the original scan's relatively large forehead triangles.
    hairMaterial.onBeforeCompile=shader=>{
      shader.vertexShader='varying vec3 vScalp;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvScalp=position;');
      shader.fragmentShader='varying vec3 vScalp;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
        float hairline=.095+max(0.,vScalp.z)*.23+sin(vScalp.x*90.)*.001;
        if(vScalp.y<hairline && !(vScalp.y>.012 && vScalp.z<-.04))discard;
      `);
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        diffuseColor.rgb*=.88+.12*sin(vScalp.x*2900.+vScalp.y*1100.);
      `);
    };
    hairMaterial.customProgramCacheKey=()=> 'fitted-scan-hair-v1';
    const hairMesh=new T.Mesh(scalp,hairMaterial);hairMesh.name='cropped_hair';head.add(hairMesh);
  }
}
