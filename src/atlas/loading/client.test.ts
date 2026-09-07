import { afterEach, describe, expect, it, vi } from 'vitest';
import { generate } from './client';

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage?: (event: { data: unknown }) => void;
  onerror?: (event: { message: string; preventDefault: () => void }) => void;
  onmessageerror?: () => void;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() { FakeWorker.instances.push(this); }
}
afterEach(() => { vi.unstubAllGlobals(); FakeWorker.instances = []; });
describe('cancellable model generation', () => {
  it('terminates cancelled work and ignores late results after navigation', () => {
    vi.stubGlobal('Worker', FakeWorker);
    const receive = vi.fn();
    const cancel = generate({ type: 'place', id: 'urithiru' }, receive);
    const worker = FakeWorker.instances[0];
    expect(worker.postMessage).toHaveBeenCalledWith({ type: 'place', id: 'urithiru' });
    cancel();
    worker.onmessage!({ data: { type: 'place', data: {} } });
    expect(worker.terminate).toHaveBeenCalled();
    expect(receive).not.toHaveBeenCalled();
  });
  it('reports worker startup and runtime failures instead of leaving a spinner', () => {
    vi.stubGlobal('Worker', class { constructor() { throw new Error('blocked'); } });
    const receive = vi.fn();
    generate({ type: 'atlas' }, receive);
    expect(receive).toHaveBeenLastCalledWith({ type: 'error', message: 'blocked' });
    vi.stubGlobal('Worker', FakeWorker);
    generate({ type: 'atlas' }, receive);
    const worker = FakeWorker.instances[0];
    worker.onerror!({ message: 'failed', preventDefault: vi.fn() });
    expect(receive).toHaveBeenLastCalledWith({ type: 'error', message: 'failed' });
    expect(worker.terminate).toHaveBeenCalled();
  });
});
