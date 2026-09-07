import {useEffect,useMemo} from 'react';
import {useGLTF,useTexture} from '@react-three/drei';
import * as T from 'three';
import {installAnatomicalPeople} from './models/anatomicalPeople';
/** Shared anatomical sources, adapted independently for each inhabitant. */
export function HeadAssets(){
 const [male,female]=useGLTF(['male','female'].map(sex=>`${import.meta.env.BASE_URL}models/inhabitants/anatomy-${sex}.glb`));
 const [skin,cloth,chitin]=useTexture(['people/face-albedo.png','rosharan-cloth-realistic.jpg','people/chitin-atlas-v1.png'].map(path=>`${import.meta.env.BASE_URL}textures/${path}`));
 const sources=useMemo(()=>{
   const extract=(asset:typeof male)=>{let geometry:T.BufferGeometry|undefined;asset.scene.updateMatrixWorld(true);asset.scene.traverse(o=>{if(o instanceof T.Mesh)geometry=o.geometry.clone().applyMatrix4(o.matrixWorld);});if(!geometry)throw new Error('Anatomical source mesh is missing');return geometry;};
   return {male:extract(male),female:extract(female)};
 },[male,female]);
 const textures=useMemo(()=>{
   const face=skin.clone(),fabric=cloth.clone(),shellColor=chitin.clone(),shellHeight=chitin.clone();
   face.colorSpace=T.SRGBColorSpace;face.anisotropy=8;face.needsUpdate=true;
   fabric.wrapS=fabric.wrapT=T.RepeatWrapping;fabric.anisotropy=8;fabric.needsUpdate=true;
   // Separately authored color and approximate height panels. Height data
   // stays linear; texel insets keep the two atlas panels apart at their edges.
   const {width,height}=chitin.image as HTMLImageElement;
   for(const texture of [shellColor,shellHeight]){texture.repeat.set(.5-1/width,1-1/height);texture.offset.set(.5/width,.5/height);texture.anisotropy=8;texture.needsUpdate=true;}
   shellColor.colorSpace=T.SRGBColorSpace;shellHeight.colorSpace=T.NoColorSpace;shellHeight.offset.x+=.5;
   return {face,fabric,shellColor,shellHeight};
 },[skin,cloth,chitin]);
 useEffect(()=>installAnatomicalPeople(sources,textures.face,textures.fabric,{color:textures.shellColor,height:textures.shellHeight}),[sources,textures]);
 return null;
}
