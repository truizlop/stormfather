import { create } from 'zustand';
export type LoadingState = { label: string; completed: number; total: number; error?: string } | null;
interface LoadingStore {
  atlas: LoadingState;
  place: LoadingState;
  atlasRevision: number;
  placeRevision: number;
  retry: () => void;
}
export const useLoading = create<LoadingStore>((set) => ({
  atlas: { label: 'Loading atlas engine', completed: 0, total: 0 },
  place: null,
  atlasRevision: 0,
  placeRevision: 0,
  retry: () => set(s => s.atlas?.error ? { atlasRevision: s.atlasRevision + 1 } : { placeRevision: s.placeRevision + 1 }),
}));
