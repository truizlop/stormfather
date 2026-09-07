import type { PlaceId } from '../data';
import type { GeometryData, ModelData } from './transfer';
export type LoadRequest = { type: 'atlas' } | { type: 'place'; id: PlaceId };
export interface AtlasData { land: GeometryData; coast: GeometryData; collars: [PlaceId, GeometryData][] }
export type LoadResponse =
  | { type: 'progress'; label: string; completed: number; total: number }
  | { type: 'atlas'; data: AtlasData }
  | { type: 'place'; data: ModelData }
  | { type: 'error'; message: string };
