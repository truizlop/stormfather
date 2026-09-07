import {useEffect,useMemo} from 'react';
import {useGLTF,useTexture} from '@react-three/drei';
import * as T from 'three';
import {installAnatomicalPeople} from './models/anatomicalPeople';
/** Shared anatomical sources, adapted independently for each inhabitant. */
export function HeadAssets(){
 const [male,female]=useGLTF(['male','female'].map(sex=>`${import.meta.env.BASE_URL}models/inhabitants/anatomy-${sex}.glb`));
 const [skin,cloth]=useTexture(['people/face-albedo.png','rosharan-cloth-realistic.jpg'].map(path=>`${import.meta.env.BASE_URL}textures/${path}`));
 const sources=useMemo(()=>{
   const extract=(asset:typeof male)=>{let geometry:T.BufferGeometry|undefined;asset.scene.updateMatrixWorld(true);asset.scene.traverse(o=>{if(o instanceof T.Mesh)geometry=o.geometry.clone().applyMatrix4(o.matrixWorld);});if(!geometry)throw new Error('Anatomical source mesh is missing');return geometry;};
   return {male:extract(male),female:extract(female)};
 },[male,female]);
 const textures=useMemo(()=>{const face=skin.clone(),fabric=cloth.clone();face.colorSpace=T.SRGBColorSpace;face.anisotropy=8;face.needsUpdate=true;fabric.wrapS=fabric.wrapT=T.RepeatWrapping;fabric.anisotropy=8;fabric.needsUpdate=true;return {face,fabric};},[skin,cloth]);
 useEffect(()=>installAnatomicalPeople(sources,textures.face,textures.fabric),[sources,textures]);
 return null;
}
