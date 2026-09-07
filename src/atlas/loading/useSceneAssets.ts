import { useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { preserveFogVisibility } from '../renderPrecision';
import type { BufferGeometry } from 'three';
import type { PlaceId } from '../data';
import type { PlaceModel } from '../models/kit';
import { disposePlace } from '../models/dispose';
import { constrainCity, placementById } from '../integration';
import { generate } from './client';
import { unpackGeometry, unpackModel } from './transfer';
import { useLoading } from './state';

export interface AtlasAssets { land: BufferGeometry; coast: BufferGeometry; collars: Map<PlaceId, BufferGeometry> }
export function useAtlasAssets(): AtlasAssets | null {
  const revision = useLoading(s => s.atlasRevision);
  const [result, setResult] = useState<{ revision: number; assets: AtlasAssets } | null>(null);
  useEffect(() => {
    let assets: AtlasAssets | undefined;
    useLoading.setState({ atlas: { label: 'Starting terrain worker', completed: 0, total: 0 } });
    const cancel = generate({ type: 'atlas' }, message => {
      if (message.type === 'progress') useLoading.setState({ atlas: message });
      if (message.type === 'error') useLoading.setState({ atlas: { label: 'Atlas', completed: 0, total: 0, error: message.message } });
      if (message.type === 'atlas') {
        assets = { land: unpackGeometry(message.data.land), coast: unpackGeometry(message.data.coast), collars: new Map(message.data.collars.map(([id, geometry]) => [id, unpackGeometry(geometry)])) };
        setResult({ revision, assets });
        useLoading.setState({ atlas: null });
      }
    });
    return () => { cancel(); assets?.land.dispose(); assets?.coast.dispose(); assets?.collars.forEach(g => g.dispose()); };
  }, [revision]);
  return result?.revision === revision ? result.assets : null;
}
export function usePlaceAsset(id: PlaceId | null): PlaceModel | null {
  const gl = useThree(s => s.gl), camera = useThree(s => s.camera), scene = useThree(s => s.scene);
  const revision = useLoading(s => s.placeRevision);
  const [result, setResult] = useState<{ id: PlaceId; revision: number; model: PlaceModel } | null>(null);
  useEffect(() => {
    if (!id) { useLoading.setState({ place: null }); return; }
    let model: PlaceModel | undefined;
    let cancelled = false, compiling = false;
    useLoading.setState({ place: { label: 'Starting city model worker', completed: 0, total: 0 } });
    const cancel = generate({ type: 'place', id }, message => {
      if (message.type === 'progress') useLoading.setState({ place: { ...message, total: 0 } });
      if (message.type === 'error') useLoading.setState({ place: { label: id, completed: 0, total: 0, error: message.message } });
      if (message.type === 'place') {
        model = unpackModel(message.data);
        constrainCity(model, placementById.get(id)!);
        const prepared = model;
        prepared.group.traverse(object => {
          if ('material' in object) for (const material of Array.isArray(object.material) ? object.material : [object.material]) preserveFogVisibility(material);
        });
        useLoading.setState({ place: { label: 'Preparing model shaders', completed: 0, total: 0 } });
        compiling = true;
        // KHR_parallel_shader_compile lets the browser service input while shaders link.
        gl.compileAsync(prepared.group, camera, scene).then(() => {
          compiling = false;
          if (cancelled) { disposePlace(prepared); return; }
          setResult({ id, revision, model: prepared });
          useLoading.setState({ place: null });
        }).catch(error => {
          compiling = false;
          if (cancelled) { disposePlace(prepared); return; }
          useLoading.setState({ place: { label: id, completed: 0, total: 0, error: String(error) } });
        });
      }
    });
    return () => { cancelled = true; cancel(); if (model && !compiling) disposePlace(model); useLoading.setState({ place: null }); };
  }, [id, revision, gl, camera, scene]);
  return result?.id === id && result.revision === revision ? result.model : null;
}
