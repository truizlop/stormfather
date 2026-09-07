import { afterEach, describe, expect, it, vi } from 'vitest';
import * as T from 'three';
import { ModelBuilder, type PlaceModel } from '../models/kit';
import { disposePlace } from '../models/dispose';
import { geometryTransfers, packGeometry, packModel, unpackGeometry, unpackModel } from './transfer';

afterEach(() => vi.restoreAllMocks());
describe('worker geometry transport', () => {
  it('transfers indexed attributes without copying buffers and retains bounds/groups', () => {
    const source = new T.BoxGeometry(2, 4, 6);
    const packed = packGeometry(source);
    const buffers = geometryTransfers(packed);
    expect(new Set(buffers).size).toBe(buffers.length);
    const cloned = structuredClone(packed, { transfer: buffers });
    expect(packed.attributes.position.array.byteLength).toBe(0);
    const restored = unpackGeometry(cloned);
    expect(restored.getAttribute('position').array).toBe(cloned.attributes.position.array);
    expect(restored.index!.count).toBe(36);
    expect(restored.groups).toEqual(source.groups);
    expect(restored.boundingSphere!.radius).toBeCloseTo(Math.sqrt(14));
    restored.dispose(); source.dispose();
  });
  it('preserves model metadata, non-enumerable camera obstacles, transforms and surface shaders', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const builder = new ModelBuilder();
    builder.box([2, 3, 4], [4, 6, 8]);
    builder.box([0, 5, 0], [1, 1, 1], '#887766', [0, 0, 0], 'window');
    const group = builder.finish('Worker_fixture');
    group.position.set(1, 2, 3); group.rotation.y = .4;
    const nested = new T.Group(); nested.name = 'Nested'; group.add(nested);
    const model: PlaceModel = { group, id: 'kholinar', radius: 30, routes: [{ id: 'walk', points: [[0,0,0],[5,0,5]], activity: 'Walking' }], features: ['test'], overview: { eye: [1,2,3], target: [0,0,0] }, close: { eye: [4,5,6], target: [1,1,1] }, water: { y: -1, size: 10, shallow: true } };
    expect(Object.keys(group.userData)).not.toContain('cameraObstacles');
    const packed = packModel(model);
    const restored = unpackModel(structuredClone(packed, { transfer: geometryTransfers(packed) }));
    expect(restored.routes).toEqual(model.routes);
    expect(restored.water).toEqual(model.water);
    expect(restored.group.userData.cameraObstacles).toEqual(group.userData.cameraObstacles);
    expect(restored.group.position.toArray()).toEqual([1,2,3]);
    expect(restored.group.rotation.y).toBeCloseTo(.4);
    const mesh = restored.group.children[0] as T.Mesh<T.BufferGeometry, T.MeshStandardMaterial>;
    expect(mesh.material.customProgramCacheKey()).toBe('field-surface-stone-1');
    expect(mesh.castShadow && mesh.receiveShadow).toBe(true);
    const window = restored.group.children[1] as T.Mesh<T.BufferGeometry, T.MeshStandardMaterial>;
    expect(window.material.emissiveIntensity).toBe(.03);
    expect(restored.group.getObjectByName('Nested')).toBeDefined();
    expect(errors).not.toHaveBeenCalled();
    disposePlace(restored); disposePlace(model);
  });
});
