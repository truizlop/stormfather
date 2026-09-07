import { useLoading } from './state';
export function LoadingStatus() {
  const atlas = useLoading(s => s.atlas);
  const place = useLoading(s => s.place);
  const retry = useLoading(s => s.retry);
  const status = atlas ?? place;
  if (!status) return null;
  return <aside className="model-loading surface" aria-label="Model loading">
    <div role={status.error ? 'alert' : 'status'} aria-live="polite">
      <strong>{status.error ? 'Model could not load' : 'Model loading'}</strong>
      <span>{status.error ? 'Please retry. You can still explore the atlas controls.' : status.label}</span>
    </div>
    {status.error ? <button onClick={retry}>Retry loading</button> : <>
      <progress aria-label="Model loading progress" max={status.total || 1} value={status.total ? status.completed : undefined}/>
      <small>You can keep using the controls while we prepare the model.</small>
    </>}
  </aside>;
}
