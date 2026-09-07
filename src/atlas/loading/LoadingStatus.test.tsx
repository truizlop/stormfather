import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LoadingStatus } from './LoadingStatus';
import { useLoading } from './state';
afterEach(cleanup);
beforeEach(() => useLoading.setState({ atlas: null, place: null, atlasRevision: 0, placeRevision: 0 }));
describe('model loading feedback', () => {
  it('announces stages, shows real completed work, and disappears on completion', () => {
    useLoading.setState({ atlas: { label: 'Building coastlines', completed: 1, total: 18 } });
    render(<LoadingStatus/>);
    expect(screen.getByRole('status')).toHaveTextContent('Building coastlines');
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '1');
    expect(screen.getByRole('progressbar')).toHaveAttribute('max', '18');
    act(() => useLoading.setState({ atlas: null }));
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
  it('retries failed city work without rebuilding the continent', () => {
    useLoading.setState({ place: { label: 'kholinar', completed: 0, total: 0, error: 'Worker failed' } });
    render(<LoadingStatus/>);
    expect(screen.getByRole('alert')).toHaveTextContent('Model could not load');
    fireEvent.click(screen.getByRole('button', { name: 'Retry loading' }));
    expect(useLoading.getState().placeRevision).toBe(1);
    expect(useLoading.getState().atlasRevision).toBe(0);
  });
});
