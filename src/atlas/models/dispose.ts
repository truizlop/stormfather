import type { PlaceModel } from './kit';
export function disposePlace(model:PlaceModel){model.group.traverse(o=>{if('geometry' in o){const mesh=o as import('three').Mesh;mesh.geometry.dispose();mesh.customDepthMaterial?.dispose();mesh.customDistanceMaterial?.dispose();(Array.isArray(mesh.material)?mesh.material:[mesh.material]).forEach(m=>m.dispose());}});}
