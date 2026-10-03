interface Playback {
  pages: number[];
  index: number;
  onStep: (page: number) => void;
  onStop: () => void;
  timer?: ReturnType<typeof setTimeout>;
}

/** Opt-in, single-pass playback; the caller owns document and visibility changes. */
export class SequencePlayer {
  private run?: Playback;
  private generation = 0;

  get playing(): boolean {
    return this.run !== undefined;
  }

  start(
    pageNumbers: number[],
    current: number,
    onStep: (page: number) => void,
    onStop: () => void,
  ): void {
    const pages = pageNumbers.slice();
    const generation = ++this.generation;
    this.cancelCurrent();
    // A callback may stop or start another run; the latest action owns playback.
    if (generation !== this.generation || pages.length < 2) return;
    const position = pages.indexOf(current);
    const restart = position < 0 || position === pages.length - 1;
    const run: Playback = { pages, index: restart ? 0 : position, onStep, onStop };
    this.run = run;
    if (restart) run.onStep(pages[0]);
    if (this.run === run) this.schedule(run);
  }

  stop(): void {
    this.generation++;
    this.cancelCurrent();
  }

  private cancelCurrent(): void {
    const run = this.run;
    if (!run) return;
    this.run = undefined;
    clearTimeout(run.timer);
    run.onStop();
  }

  private schedule(run: Playback): void {
    run.timer = setTimeout(() => {
      if (this.run !== run) return;
      run.timer = undefined;
      run.index++;
      run.onStep(run.pages[run.index]);
      if (this.run !== run) return;
      if (run.index === run.pages.length - 1) this.stop();
      else this.schedule(run);
    }, 1400);
  }
}
