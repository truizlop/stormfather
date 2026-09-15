import { useEffect } from 'react';
import { useThree, type RootState } from '@react-three/fiber';
import type { PlaceModel } from './models/kit';

declare global {
  interface Window {
    stormfatherCapture?: { root: RootState; model: PlaceModel | null };
  }
}

export function CinematicCapture({ model }: { model: PlaceModel | null }) {
  const root = useThree();
  useEffect(() => {
    window.stormfatherCapture = { root, model };
    return () => { delete window.stormfatherCapture; };
  }, [root, model]);
  return null;
}
