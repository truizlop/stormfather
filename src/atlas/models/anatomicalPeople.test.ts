/// <reference types="node" />
import {beforeAll,expect,it} from 'vitest';
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {buildPerson,animatePerson,type PersonKind} from './person';
import {installAnatomicalPeople,setPersonAppearance} from './anatomicalPeople';
import {personAppearance} from './peopleProfiles';
import {disposePlace} from './dispose';
import type {PlaceModel} from './kit';

beforeAll(async()=>{
 const load=async(sex:string)=>{
  const bytes=await readFile(`public/models/inhabitants/anatomy-${sex}.glb`),data=new ArrayBuffer(bytes.byteLength);new Uint8Array(data).set(bytes);
  const asset=await new GLTFLoader().parseAsync(data,'');let g:T.BufferGeometry|undefined;
  asset.scene.updateMatrixWorld(true);asset.scene.traverse(o=>{if(o instanceof T.Mesh)g=o.geometry.clone().applyMatrix4(o.matrixWorld);});return g!;
 };
 installAnatomicalPeople({male:await load('male'),female:await load('female')});
});
it.each(['resident','bridger','radiant','workform','warform'] as PersonKind[])('keeps the loaded %s anatomy and skin weights valid through motion',kind=>{
 const rig=buildPerson(0,kind);expect(rig.group.userData.anatomical).toBe(true);
 let triangles=0,skin:T.SkinnedMesh|undefined;const deforming:T.SkinnedMesh[]=[];
 rig.group.traverse(o=>{if(o instanceof T.Mesh)triangles+=(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3;if(o.name==='continuous_anatomy')skin=o as T.SkinnedMesh;if(o instanceof T.SkinnedMesh)deforming.push(o);});
 expect(triangles).toBeLessThan(180000);expect(skin).toBeDefined();
 const w=skin!.geometry.getAttribute('skinWeight');for(let i=0;i<w.count;i++)expect(w.getX(i)+w.getY(i)+w.getZ(i)+w.getW(i)).toBeCloseTo(1,5);
 const vertex=new T.Vector3();
 for(const [time,pace,carry,gesture] of [[0,0,0,0],[.3,1,0,0],[1.2,1,0,0],[1,0,1,0],[2,0,0,1]]){
  animatePerson(rig,time,pace,Boolean(carry),gesture);rig.group.updateMatrixWorld(true);
  // Fitted shell, collars and cloth share the body rig. Check their deformed
  // bounds too: a valid skin mesh alone cannot catch bad accessory weights.
  for(const mesh of deforming)for(let i=0;i<mesh.geometry.getAttribute('position').count;i+=31){mesh.getVertexPosition(i,vertex);expect(vertex.toArray().every(Number.isFinite)).toBe(true);expect(vertex.length()).toBeLessThan(3);}
 }
 disposePlace({group:rig.group} as PlaceModel);
});
it('changes pooled identity without replacing animation joints, cargo or world pose',()=>{
 const rig=buildPerson(0),arm=rig.arms[0],cargo=new T.Group(),parent=new T.Group();rig.group.add(cargo);parent.position.set(8,3,-4);parent.add(rig.group);rig.group.position.set(2,0,7);rig.group.rotation.y=.8;rig.group.scale.setScalar(1.2);
 const pose=rig.group.position.clone();setPersonAppearance(rig,personAppearance('iriali',1));
 expect(rig.arms[0]).toBe(arm);expect(cargo.parent).toBe(rig.group);expect(rig.group.parent).toBe(parent);expect(rig.group.position.equals(pose)).toBe(true);
 expect(rig.group.userData.appearance).toMatchObject({culture:'iriali',sex:'female'});
 let skins=0;rig.group.traverse(o=>{if(o.name==='continuous_anatomy')skins++;});expect(skins).toBe(1);
 const same=rig.group.getObjectByName('continuous_anatomy');setPersonAppearance(rig,personAppearance('iriali',1));expect(rig.group.getObjectByName('continuous_anatomy')).toBe(same);
 disposePlace({group:rig.group} as PlaceModel);
});
