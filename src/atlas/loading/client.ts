import type { LoadRequest, LoadResponse } from './protocol';

/** Each request owns a worker so navigation can interrupt CPU-bound generation. */
export function generate(request: LoadRequest, receive: (message: LoadResponse) => void): () => void {
  let worker: Worker | undefined;
  let cancelled = false;
  const fail = (message: string) => {
    if (!cancelled) receive({ type: 'error', message });
    worker?.terminate();
  };
  try {
    worker = new Worker(new URL('./scene.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }: MessageEvent<LoadResponse>) => {
      if (cancelled) return;
      try {
        receive(data);
        if (data.type !== 'progress') worker?.terminate();
      } catch (error) {
        fail(error instanceof Error ? error.message : 'The model could not be prepared');
      }
    };
    worker.onerror = event => { event.preventDefault(); fail(event.message || 'The model worker could not start'); };
    worker.onmessageerror = () => fail('The model data could not be read');
    worker.postMessage(request);
  } catch (error) {
    fail(error instanceof Error ? error.message : 'Background model loading is unavailable');
  }
  return () => { cancelled = true; worker?.terminate(); };
}
