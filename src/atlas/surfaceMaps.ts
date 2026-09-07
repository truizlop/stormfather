import * as T from 'three';

export const materialSets=['brick','cobble','rock','grass','wood','earth'] as const;
type SetName=typeof materialSets[number];
interface SurfaceDefinition {set:SetName;tile:number;normal:number;color:number;tint:number;roughness:number;triplanar?:boolean}
const definitions:Record<string,SurfaceDefinition>={
 stone:{set:'rock',tile:4,normal:.28,color:.18,tint:1,roughness:.92,triplanar:true},
 masonry:{set:'brick',tile:3.2,normal:.65,color:1,tint:.28,roughness:.92},
 paving:{set:'cobble',tile:3.4,normal:.8,color:1,tint:.28,roughness:.8},
 rock:{set:'rock',tile:8,normal:1,color:.8,tint:.38,roughness:.95,triplanar:true},
 windstone:{set:'rock',tile:12,normal:.85,color:.7,tint:.4,roughness:.95,triplanar:true},
 strata:{set:'rock',tile:6,normal:.45,color:.28,tint:.9,roughness:.88,triplanar:true},
 cutstone:{set:'rock',tile:1.4,normal:.17,color:.12,tint:1,roughness:.85,triplanar:true},
 ashlar:{set:'rock',tile:2,normal:.25,color:.2,tint:1,roughness:.87,triplanar:true},
 plaster:{set:'rock',tile:2.3,normal:.1,color:.08,tint:1,roughness:.92,triplanar:true},
 earth:{set:'earth',tile:4,normal:.65,color:.8,tint:.35,roughness:1,triplanar:true},
 grass:{set:'grass',tile:12,normal:.5,color:.3,tint:1,roughness:1,triplanar:true},
 timber:{set:'wood',tile:3.2,normal:.4,color:.5,tint:.6,roughness:.82},
 bark:{set:'wood',tile:1,normal:.9,color:.8,tint:.5,roughness:1,triplanar:true},
};

/** Triplanar projection keeps cliffs and curved roots continuous across faces. */
export function applySurfaceMaps(object:T.Mesh,textures:T.Texture[]){
 if(Array.isArray(object.material)||!(object.material instanceof T.MeshStandardMaterial))return;
 const material=object.material,kind=material.userData.surface as string,d=definitions[kind];
 if(!d||material.userData.photographic)return;
 material.userData.photographic=true;
 const colors=object.geometry.getAttribute('color');
 if(colors&&d.tint<1){for(let i=0;i<colors.count;i++)colors.setXYZ(i,1-d.tint+colors.getX(i)*d.tint,1-d.tint+colors.getY(i)*d.tint,1-d.tint+colors.getZ(i)*d.tint);colors.needsUpdate=true;}
 const start=materialSets.indexOf(d.set)*3;
 material.roughness=d.roughness;
 if(!d.triplanar){
  const pos=object.geometry.getAttribute('position'),norm=object.geometry.getAttribute('normal'),uv=new Float32Array(pos.count*2);
  for(let i=0;i<pos.count;i++){
   if(kind==='paving'||Math.abs(norm.getY(i))>.7){uv[i*2]=pos.getX(i)/d.tile;uv[i*2+1]=pos.getZ(i)/d.tile;}
   else{uv[i*2]=(Math.abs(norm.getX(i))>.7?pos.getZ(i):pos.getX(i))/d.tile;uv[i*2+1]=pos.getY(i)/d.tile;}
  }
  object.geometry.setAttribute('uv',new T.BufferAttribute(uv,2));
  material.map=textures[start];material.normalMap=textures[start+1];material.roughnessMap=textures[start+2];material.aoMap=textures[start+2];material.normalScale.setScalar(d.normal);material.aoMapIntensity=.9;
 }
 const previous=material.onBeforeCompile,key=material.customProgramCacheKey();
 material.onBeforeCompile=(shader,renderer)=>{
  previous.call(material,shader,renderer);
  shader.uniforms.uSurfaceWet={value:0};material.userData.wetUniform=shader.uniforms.uSurfaceWet;
  shader.fragmentShader='uniform float uSurfaceWet;\n'+shader.fragmentShader;
  if(d.triplanar){
   shader.uniforms.uDetailAlbedo={value:textures[start]};shader.uniforms.uDetailNormal={value:textures[start+1]};shader.uniforms.uDetailARM={value:textures[start+2]};
   shader.vertexShader='varying vec3 vDetailNormal;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nvDetailNormal=normal;');
   shader.fragmentShader=`varying vec3 vDetailNormal;uniform mat3 normalMatrix;uniform sampler2D uDetailAlbedo,uDetailNormal,uDetailARM;
    vec4 sampleTerrain(sampler2D tex,vec3 p,vec3 w){return texture2D(tex,p.zy)*w.x+texture2D(tex,p.xz)*w.y+texture2D(tex,p.xy)*w.z;}
   `+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
    vec3 terrainN=normalize(vDetailNormal),terrainW=pow(abs(terrainN),vec3(6.));terrainW/=max(dot(terrainW,vec3(1.)),.0001);
    vec3 terrainP=vSurfacePosition/${d.tile.toFixed(2)};
    vec3 terrainAlbedo=sampleTerrain(uDetailAlbedo,terrainP,terrainW).rgb;
    vec3 terrainARM=sampleTerrain(uDetailARM,terrainP,terrainW).rgb;
    diffuseColor.rgb*=mix(vec3(1.),terrainAlbedo,${d.color.toFixed(2)})*mix(.77,1.,terrainARM.r);
   `);
   shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`
    vec3 nx=texture2D(uDetailNormal,terrainP.zy).xyz*2.-1.,ny=texture2D(uDetailNormal,terrainP.xz).xyz*2.-1.,nz=texture2D(uDetailNormal,terrainP.xy).xyz*2.-1.;
    nx.xy*=${d.normal.toFixed(2)};ny.xy*=${d.normal.toFixed(2)};nz.xy*=${d.normal.toFixed(2)};
    nx=vec3(nx.xy+terrainN.zy,nx.z*terrainN.x);ny=vec3(ny.xy+terrainN.xz,ny.z*terrainN.y);nz=vec3(nz.xy+terrainN.xy,nz.z*terrainN.z);
    normal=normalize(normalMatrix*normalize(nx.zyx*terrainW.x+ny.xzy*terrainW.y+nz.xyz*terrainW.z))*faceDirection;
   `);
  }else if(d.color<1){
   shader.fragmentShader=shader.fragmentShader.replace('diffuseColor *= sampledDiffuseColor;',`diffuseColor *= mix(vec4(1.),sampledDiffuseColor,${d.color.toFixed(2)});`);
  }
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   ${d.triplanar?'roughnessFactor*=mix(.68,1.,terrainARM.g);':''}
   roughnessFactor=mix(roughnessFactor,${kind==='paving'?'.21':'.58'},uSurfaceWet);
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=mix(1.,.78,uSurfaceWet);');
 };
 material.customProgramCacheKey=()=>key+'-physical-terrain-v2';material.needsUpdate=true;
}

let surfacePromise:Promise<T.Texture[]>|undefined;
/** Begin alongside the model worker, then upload before the only shader warm-up. */
export function loadSurfaceTextures(gl:T.WebGLRenderer){
 if(!surfacePromise){
  const loader=new T.TextureLoader();
  surfacePromise=Promise.all(materialSets.flatMap(set=>['color','normal','arm'].map(channel=>loader.loadAsync(`${import.meta.env.BASE_URL}textures/realism/${set}-${channel}.jpg`)))).then(textures=>{
   textures.forEach((t,i)=>{t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=Math.min(8,gl.capabilities.getMaxAnisotropy());t.colorSpace=i%3===0?T.SRGBColorSpace:T.NoColorSpace;t.needsUpdate=true;});return textures;
  }).catch(error=>{surfacePromise=undefined;throw error;});
 }
 return surfacePromise.then(textures=>{textures.forEach(t=>gl.initTexture(t));return textures;});
}
