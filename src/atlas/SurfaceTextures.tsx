import {useFrame} from '@react-three/fiber';
import * as T from 'three';
import type {PlaceModel} from './models/kit';
import {worldClock} from './store';

/** Maps are loaded and compiled before revealing the city; only weather varies. */
export function SurfaceTextures({model}:{model:PlaceModel}){
 useFrame(()=>model.group.traverse(o=>{if(o instanceof T.Mesh&&!Array.isArray(o.material)){const uniform=o.material.userData.wetUniform;if(uniform)uniform.value=worldClock.storm;}}));
 return null;
}
