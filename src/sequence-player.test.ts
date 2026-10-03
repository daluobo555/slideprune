import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SequencePlayer } from './sequence-player';

describe('SequencePlayer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('advances once per 1400 ms and stops after the last step without looping', () => {
    const player = new SequencePlayer();
    const onStep = vi.fn();
    const onStop = vi.fn();
    player.start([2, 4, 7], 2, onStep, onStop);
    expect(player.playing).toBe(true);
    vi.advanceTimersByTime(1399);
    expect(onStep).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onStep.mock.calls).toEqual([[4]]);
    expect(onStop).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1400);
    expect(onStep.mock.calls).toEqual([[4], [7]]);
    expect(onStop).toHaveBeenCalledExactlyOnceWith();
    expect(player.playing).toBe(false);
    vi.advanceTimersByTime(14000);
    expect(onStep).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('restarts immediately from the first page when current is the final page', () => {
    const player = new SequencePlayer();
    const onStep = vi.fn();
    const onStop = vi.fn();
    player.start([3, 5, 9], 9, onStep, onStop);
    expect(onStep.mock.calls).toEqual([[3]]);
    expect(player.playing).toBe(true);
    vi.runAllTimers();
    expect(onStep.mock.calls).toEqual([[3], [5], [9]]);
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('stops idempotently and never emits a delayed step after stopping', () => {
    const player = new SequencePlayer();
    const onStep = vi.fn();
    const onStop = vi.fn();
    player.start([1, 2, 3], 1, onStep, onStop);
    vi.advanceTimersByTime(700);
    player.stop();
    player.stop();
    expect(player.playing).toBe(false);
    expect(onStop).toHaveBeenCalledTimes(1);
    vi.runAllTimers();
    expect(onStep).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([{ pages: [] }, { pages: [1] }])(
    'never plays an empty or single-page sequence: $pages',
    ({ pages }) => {
      const player = new SequencePlayer();
      const onStep = vi.fn();
      const onStop = vi.fn();
      player.start(pages, 1, onStep, onStop);
      expect(player.playing).toBe(false);
      expect(vi.getTimerCount()).toBe(0);
      expect(onStep).not.toHaveBeenCalled();
      expect(onStop).not.toHaveBeenCalled();
    },
  );

  it('continues from the current middle page', () => {
    const player = new SequencePlayer();
    const onStep = vi.fn();
    const onStop = vi.fn();
    player.start([3, 6, 8, 11], 8, onStep, onStop);
    expect(onStep).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(onStep.mock.calls).toEqual([[11]]);
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('starts at the first page if current is absent from the sequence', () => {
    const player = new SequencePlayer();
    const onStep = vi.fn();
    player.start([3, 6], 99, onStep, vi.fn());
    expect(onStep.mock.calls).toEqual([[3]]);
    vi.runAllTimers();
    expect(onStep.mock.calls).toEqual([[3], [6]]);
  });

  it('clones source page numbers so subsequent caller mutations do not alter playback', () => {
    const player = new SequencePlayer();
    const pages = [2, 4, 6];
    const onStep = vi.fn();
    player.start(pages, 2, onStep, vi.fn());
    pages.splice(0, 3, 90, 91);
    vi.runAllTimers();
    expect(onStep.mock.calls).toEqual([[4], [6]]);
  });

  it('restarting stops the old run and schedules the replacement from a fresh interval', () => {
    const player = new SequencePlayer();
    const oldStep = vi.fn();
    const oldStop = vi.fn();
    const nextStep = vi.fn();
    const nextStop = vi.fn();
    player.start([1, 2, 3], 1, oldStep, oldStop);
    vi.advanceTimersByTime(1000);
    player.start([10, 20], 10, nextStep, nextStop);
    expect(oldStop).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(400);
    expect(oldStep).not.toHaveBeenCalled();
    expect(nextStep).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(nextStep.mock.calls).toEqual([[20]]);
    expect(nextStop).toHaveBeenCalledTimes(1);
    expect(player.playing).toBe(false);
  });

  it('starting an unplayable sequence cancels the previous run', () => {
    const player = new SequencePlayer();
    const oldStep = vi.fn();
    const oldStop = vi.fn();
    const nextStep = vi.fn();
    const nextStop = vi.fn();
    player.start([1, 2], 1, oldStep, oldStop);
    player.start([], 1, nextStep, nextStop);
    vi.runAllTimers();
    expect(oldStop).toHaveBeenCalledTimes(1);
    expect(oldStep).not.toHaveBeenCalled();
    expect(nextStep).not.toHaveBeenCalled();
    expect(nextStop).not.toHaveBeenCalled();
    expect(player.playing).toBe(false);
  });

  it('can stop reentrantly inside a timed onStep callback', () => {
    const player = new SequencePlayer();
    const onStep = vi.fn(() => player.stop());
    const onStop = vi.fn();
    player.start([1, 2, 3], 1, onStep, onStop);
    vi.runAllTimers();
    expect(onStep.mock.calls).toEqual([[2]]);
    expect(onStop).toHaveBeenCalledTimes(1);
    expect(player.playing).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not schedule anything if the immediate restart callback stops playback', () => {
    const player = new SequencePlayer();
    const onStep = vi.fn(() => player.stop());
    const onStop = vi.fn();
    player.start([1, 2], 2, onStep, onStop);
    expect(onStep.mock.calls).toEqual([[1]]);
    expect(onStop).toHaveBeenCalledTimes(1);
    expect(player.playing).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('marks playback stopped before calling onStop, which may stop it again', () => {
    const player = new SequencePlayer();
    const onStop = vi.fn(() => {
      expect(player.playing).toBe(false);
      player.stop();
    });
    player.start([1, 2], 1, vi.fn(), onStop);
    vi.runAllTimers();
    expect(onStop).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('allows onStep to replace playback without an old tick stopping the new run', () => {
    const player = new SequencePlayer();
    const nextStep = vi.fn();
    const nextStop = vi.fn();
    const oldStop = vi.fn();
    const oldStep = vi.fn(() => player.start([10, 20], 10, nextStep, nextStop));
    player.start([1, 2], 1, oldStep, oldStop);
    vi.advanceTimersByTime(1400);
    expect(oldStop).toHaveBeenCalledTimes(1);
    expect(player.playing).toBe(true);
    expect(nextStep).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1400);
    expect(nextStep.mock.calls).toEqual([[20]]);
    expect(nextStop).toHaveBeenCalledTimes(1);
  });

  it('honors a newer start inside onStop instead of overwriting its active run', () => {
    const player = new SequencePlayer();
    const latestStep = vi.fn();
    const latestStop = vi.fn();
    const replacedStep = vi.fn();
    const replacedStop = vi.fn();
    player.start([1, 2], 1, vi.fn(), () => {
      player.start([100, 200], 100, latestStep, latestStop);
    });
    player.start([10, 20], 10, replacedStep, replacedStop);
    vi.runAllTimers();
    expect(latestStep.mock.calls).toEqual([[200]]);
    expect(latestStop).toHaveBeenCalledTimes(1);
    expect(replacedStep).not.toHaveBeenCalled();
    expect(replacedStop).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
