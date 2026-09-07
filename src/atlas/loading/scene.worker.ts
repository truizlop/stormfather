import { createAtlasLand, createCoastWalls } from '../geographyModel';
import { cityPlacements, cityTerrainBoundaries, createCityTerrain } from '../integration';
import { joinTerrain } from '../terrainJoin';
import { buildPlace, disposePlace } from '../models';
import { places } from '../data';
import { geometryTransfers, packGeometry, packModel } from './transfer';
import type { LoadRequest, LoadResponse, AtlasData } from './protocol';

const send = (message: LoadResponse, transfers: ArrayBuffer[] = []) => self.postMessage(message, { transfer: transfers });
self.onmessage = ({ data }: MessageEvent<LoadRequest>) => {
  try {
    if (data.type === 'place') {
      send({ type: 'progress', label: `Building ${places.find(p => p.id === data.id)!.name} model`, completed: 0, total: 1 });
      const model = buildPlace(data.id);
      const packed = packModel(model);
      send({ type: 'place', data: packed }, geometryTransfers(packed));
      disposePlace(model);
      return;
    }
    const total = cityPlacements.length + 2;
    send({ type: 'progress', label: 'Building continent terrain', completed: 0, total });
    const source = createAtlasLand();
    const joined = joinTerrain(source, cityPlacements);
    source.dispose();
    for (const [id, points] of joined.boundaries) cityTerrainBoundaries.set(id, points);
    send({ type: 'progress', label: 'Building coastlines', completed: 1, total });
    const coast = createCoastWalls();
    const collars: AtlasData['collars'] = [];
    for (const [index, placement] of cityPlacements.entries()) {
      send({ type: 'progress', label: `Preparing ${places.find(p => p.id === placement.id)!.name} terrain`, completed: index + 2, total });
      const geometry = createCityTerrain(placement);
      collars.push([placement.id, packGeometry(geometry)]);
      geometry.dispose();
    }
    const result: AtlasData = { land: packGeometry(joined.geometry), coast: packGeometry(coast), collars };
    send({ type: 'atlas', data: result }, geometryTransfers(result));
    joined.geometry.dispose(); coast.dispose();
  } catch (error) {
    send({ type: 'error', message: error instanceof Error ? error.message : 'Model generation failed' });
  }
};
