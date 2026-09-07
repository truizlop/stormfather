import type { Object3D } from 'three';
/** Mutable renderer subjects; positions never enter React's render state. */
export interface WildlifeSubject {object:Object3D;length:number;height:number;name:string}
export const wildlifeSubjects=new Map<string,WildlifeSubject>();

export const radiantSubjects=new Map<string,WildlifeSubject>();
