/** Keeps only the current export, including work that is still in progress. */
export class ExportCache {
  private entry: { key: string; promise: Promise<Uint8Array> } | null = null;

  get(key: string, create: () => Promise<Uint8Array>): Promise<Uint8Array> {
    if (this.entry?.key === key) return this.entry.promise;

    const entry = {
      key,
      promise: Promise.resolve()
        .then(create)
        .catch((error: unknown) => {
          if (this.entry === entry) this.entry = null;
          throw error;
        }),
    };
    this.entry = entry;
    return entry.promise;
  }

  clear(): void {
    this.entry = null;
  }
}
