import * as T from 'three';
import type { PlaceModel } from '../models/kit';
import { enrichMaterial } from '../materials';

interface AttributeData { array: T.TypedArray; itemSize: number; normalized: boolean }
export interface GeometryData {
  attributes: Record<string, AttributeData>;
  index: AttributeData | null;
  groups: T.BufferGeometry['groups'];
  sphere: { center: number[]; radius: number };
}
export function packGeometry(geometry: T.BufferGeometry): GeometryData {
  geometry.computeBoundingSphere();
  const attribute = (a: T.BufferAttribute): AttributeData => ({ array: a.array, itemSize: a.itemSize, normalized: a.normalized });
  return {
    attributes: Object.fromEntries(Object.entries(geometry.attributes).map(([key, a]) => {
      if (a instanceof T.InterleavedBufferAttribute) throw new Error('Interleaved model attributes are unsupported');
      return [key, attribute(a)];
    })),
    index: geometry.index ? attribute(geometry.index) : null,
    groups: geometry.groups,
    sphere: { center: geometry.boundingSphere!.center.toArray(), radius: geometry.boundingSphere!.radius },
  };
}
export function unpackGeometry(data: GeometryData): T.BufferGeometry {
  const geometry = new T.BufferGeometry();
  for (const [key, a] of Object.entries(data.attributes)) geometry.setAttribute(key, new T.BufferAttribute(a.array, a.itemSize, a.normalized));
  if (data.index) geometry.setIndex(new T.BufferAttribute(data.index.array, data.index.itemSize, data.index.normalized));
  geometry.groups = data.groups;
  geometry.boundingSphere = new T.Sphere(new T.Vector3().fromArray(data.sphere.center), data.sphere.radius);
  return geometry;
}
interface NodeData {
  name: string;
  matrix: number[];
  userData: T.Object3D['userData'];
  castShadow: boolean;
  receiveShadow: boolean;
  visible: boolean;
  geometry?: GeometryData;
  materials?: ReturnType<T.Material['toJSON']>[];
  children: NodeData[];
}
export type ModelData = Omit<PlaceModel, 'group'> & { group: NodeData };
export function packModel(model: PlaceModel): ModelData {
  function packNode(object: T.Object3D): NodeData {
    object.updateMatrix();
    const mesh = object instanceof T.Mesh ? object : undefined;
    return {
      name: object.name, matrix: object.matrix.toArray(),
      // Camera obstacles are intentionally non-enumerable in downloadable assets.
      userData: { ...object.userData, ...(object.userData.cameraObstacles ? { cameraObstacles: object.userData.cameraObstacles } : {}) },
      castShadow: object.castShadow, receiveShadow: object.receiveShadow, visible: object.visible,
      geometry: mesh ? packGeometry(mesh.geometry) : undefined,
      materials: mesh ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map(m => m.toJSON()) : undefined,
      children: object.children.map(packNode),
    };
  }
  return { ...model, group: packNode(model.group) };
}
export function unpackModel(data: ModelData): PlaceModel {
  const loader = new T.MaterialLoader();
  function unpackNode(node: NodeData): T.Object3D {
    const materials = node.materials?.map(json => {
      const material = loader.parse(json);
      if (material instanceof T.MeshStandardMaterial && typeof material.userData.surface === 'string') enrichMaterial(material, material.userData.surface);
      return material;
    });
    const object = node.geometry ? new T.Mesh(unpackGeometry(node.geometry), materials?.length === 1 ? materials[0] : materials) : new T.Group();
    object.name = node.name;
    object.matrix.fromArray(node.matrix).decompose(object.position, object.quaternion, object.scale);
    object.userData = node.userData;
    object.castShadow = node.castShadow; object.receiveShadow = node.receiveShadow; object.visible = node.visible;
    for (const child of node.children) object.add(unpackNode(child));
    return object;
  }
  return { ...data, group: unpackNode(data.group) as T.Group };
}
/** Transfer ownership of vertex buffers; never clone millions of JS numbers. */
export function geometryTransfers(value: unknown): ArrayBuffer[] {
  const buffers = new Set<ArrayBuffer>();
  function visit(item: unknown) {
    if (ArrayBuffer.isView(item)) { buffers.add(item.buffer as ArrayBuffer); return; }
    if (item && typeof item === 'object') for (const child of Object.values(item)) visit(child);
  }
  visit(value);
  return [...buffers];
}
