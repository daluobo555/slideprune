import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('pdfjs-dist', () => ({ getDocument: vi.fn(), GlobalWorkerOptions: {} }));

import { getDocument } from 'pdfjs-dist';
import { extractTextLines, prepareDocumentPages, renderPdfPreview } from './pdf';
import type { PageSnapshot } from './types';

const bytes = new TextEncoder().encode('%PDF-1.7\nlocal test fixture');
const getDocumentMock = vi.mocked(getDocument);

function setupPdf(width = 595, height = 842) {
  const renderTask = { promise: Promise.resolve(), cancel: vi.fn() };
  const page = {
    getViewport: vi.fn(({ scale }: { scale: number }) => ({
      width: width * scale,
      height: height * scale,
    })),
    render: vi.fn(() => renderTask),
    cleanup: vi.fn(),
    getTextContent: vi.fn(),
  };
  const pdf = {
    numPages: 4,
    getPermissions: vi.fn(async () => null),
    getPage: vi.fn(async () => page),
  };
  const task = {
    promise: Promise.resolve(pdf),
    destroy: vi.fn(async () => undefined),
    onPassword: undefined,
  };
  getDocumentMock.mockReturnValue(task as unknown as ReturnType<typeof getDocument>);
  const context = {};
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => context),
    toDataURL: vi.fn(() => 'data:image/webp;base64,preview'),
  };
  vi.stubGlobal('document', { createElement: vi.fn(() => canvas) });
  return { page, pdf, task, canvas, renderTask };
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe('editable document preparation', () => {
  const snapshots = [1, 2, 3, 4].map((pageNumber) => ({
    pageNumber,
    text: `Page ${pageNumber}`,
    textLines: [`Page ${pageNumber}`, '中文 & formula x²'],
  })) as PageSnapshot[];

  it('preserves provided line endings and ignores marked-content entries', () => {
    expect(
      extractTextLines([
        { type: 'beginMarkedContent' },
        { str: 'One' },
        { str: ' two', hasEOL: true },
        { str: '', hasEOL: true },
        { str: ' 中文\t内容 ', hasEOL: true },
        { str: 'Last' },
      ]),
    ).toEqual(['One two', '中文 内容', 'Last']);
  });

  it('returns only selected text in source order without creating an image worker', async () => {
    const selected = [3, 1];
    const result = await prepareDocumentPages(bytes, snapshots, selected, false);
    expect(result.map((page) => page.pageNumber)).toEqual([1, 3]);
    expect(result[0].textLines).toEqual(snapshots[0].textLines);
    expect(result[0].textLines).not.toBe(snapshots[0].textLines);
    expect(result.every((page) => !page.image)).toBe(true);
    expect(selected).toEqual([3, 1]);
    expect(getDocumentMock).not.toHaveBeenCalled();
  });

  it('does not insert spaces inside words split by a font change', () => {
    expect(
      extractTextLines([
        { str: 'micro' },
        { str: 'scope' },
        { str: ' ' },
        { str: '仪' },
        { str: '器', hasEOL: true },
      ]),
    ).toEqual(['microscope 仪器']);
  });

  it('renders selected original pages to bounded PNGs using one worker', async () => {
    const { canvas, task, pdf, page } = setupPdf(20000, 1000);
    canvas.toDataURL.mockReturnValue('data:image/png;base64,AQID');
    const progress = vi.fn();
    const result = await prepareDocumentPages(bytes, snapshots, [4, 2], true, progress);
    expect(pdf.getPage.mock.calls).toEqual([[2], [4]]);
    expect(getDocumentMock).toHaveBeenCalledOnce();
    expect(result[0].image).toEqual({ bytes: new Uint8Array([1, 2, 3]), width: 1280, height: 64 });
    expect(canvas.toDataURL).toHaveBeenCalledWith('image/png');
    expect(page.getTextContent).not.toHaveBeenCalled();
    expect(progress.mock.calls).toEqual([
      [0, 2],
      [1, 2],
      [2, 2],
    ]);
    expect(task.destroy).toHaveBeenCalledOnce();
    expect(page.cleanup).toHaveBeenCalledTimes(2);
    expect([canvas.width, canvas.height]).toEqual([0, 0]);
  });

  it.each([[], [1, 1], [0], [5]].map((selected) => ({ selected })))(
    'rejects an invalid selection $selected',
    async ({ selected }) => {
      await expect(prepareDocumentPages(bytes, snapshots, selected, false)).rejects.toThrow();
      expect(getDocumentMock).not.toHaveBeenCalled();
    },
  );

  it('cancels between image pages and releases resources', async () => {
    const { task, pdf, canvas } = setupPdf();
    canvas.toDataURL.mockReturnValue('data:image/png;base64,AQID');
    const controller = new AbortController();
    await expect(
      prepareDocumentPages(
        bytes,
        snapshots,
        [1, 2],
        true,
        (done) => {
          if (done === 1) controller.abort();
        },
        controller.signal,
      ),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(pdf.getPage).toHaveBeenCalledExactlyOnceWith(1);
    expect(task.destroy).toHaveBeenCalledOnce();
    expect([canvas.width, canvas.height]).toEqual([0, 0]);
  });

  it('rejects cancellation even from the final text-only progress callback', async () => {
    const controller = new AbortController();
    await expect(
      prepareDocumentPages(
        bytes,
        snapshots,
        [1],
        false,
        (done) => {
          if (done) controller.abort();
        },
        controller.signal,
      ),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(getDocumentMock).not.toHaveBeenCalled();
  });
});

describe('real PDF page preview orchestration', () => {
  it('renders only the requested page without extracting text or reading other pages', async () => {
    const { page, pdf, task, canvas } = setupPdf();
    expect(await renderPdfPreview(bytes, 3)).toBe('data:image/webp;base64,preview');
    expect(pdf.getPage).toHaveBeenCalledExactlyOnceWith(3);
    expect(page.getTextContent).not.toHaveBeenCalled();
    expect(page.render).toHaveBeenCalledOnce();
    expect(canvas.toDataURL).toHaveBeenCalledWith('image/webp', 0.92);
    expect(page.cleanup).toHaveBeenCalledOnce();
    expect(task.destroy).toHaveBeenCalledOnce();
    expect([canvas.width, canvas.height]).toEqual([0, 0]);
    const options = getDocumentMock.mock.calls[0][0] as {
      data: Uint8Array;
      useWorkerFetch: boolean;
      BinaryDataFactory: unknown;
    };
    expect(options.data).not.toBe(bytes);
    expect(options.data).toEqual(bytes);
    expect(options.useWorkerFetch).toBe(false);
    expect(options.BinaryDataFactory).toBeTypeOf('function');
  });

  it('defaults to the first page and bounds giant portrait pages', async () => {
    const { pdf, page } = setupPdf(1000, 20000);
    await renderPdfPreview(bytes);
    expect(pdf.getPage).toHaveBeenCalledExactlyOnceWith(1);
    const renderOptions = page.render.mock.calls[0] as unknown as [
      { viewport: { width: number; height: number } },
    ];
    expect(renderOptions[0].viewport.height).toBe(1600);
    expect(renderOptions[0].viewport.width).toBe(80);
  });

  it.each([
    { width: 20000, height: 1000, expected: [2200, 110] },
    { width: 1000, height: 20000, expected: [160, 3200] },
    { width: 595, height: 842, expected: [2200, 3114] },
  ])(
    'bounds high-detail $width x $height pages and releases their canvas',
    async ({ width, height, expected }) => {
      const { canvas, task, page } = setupPdf(width, height);
      let renderedSize: number[] = [];
      canvas.toDataURL.mockImplementation(() => {
        renderedSize = [canvas.width, canvas.height];
        return 'data:image/webp;base64,high-preview';
      });
      expect(await renderPdfPreview(bytes, 1, undefined, { detail: 'high' })).toBe(
        'data:image/webp;base64,high-preview',
      );
      expect(renderedSize).toEqual(expected);
      expect(renderedSize[0]).toBeLessThanOrEqual(2200);
      expect(renderedSize[1]).toBeLessThanOrEqual(3200);
      expect([canvas.width, canvas.height]).toEqual([0, 0]);
      expect(page.cleanup).toHaveBeenCalledOnce();
      expect(task.destroy).toHaveBeenCalledOnce();
    },
  );

  it.each([undefined, {}, { detail: 'standard' as const }])(
    'retains the standard preview size with options %j',
    async (options) => {
      const { canvas } = setupPdf(1100, 1600);
      let renderedSize: number[] = [];
      canvas.toDataURL.mockImplementation(() => {
        renderedSize = [canvas.width, canvas.height];
        return 'data:image/webp;base64,standard-preview';
      });
      await renderPdfPreview(bytes, 1, undefined, options);
      expect(renderedSize).toEqual([1100, 1600]);
    },
  );

  it.each([0, -1, 1.5, NaN])(
    'rejects invalid page number %s before creating a worker',
    async (number) => {
      await expect(renderPdfPreview(bytes, number)).rejects.toThrow('page number');
      expect(getDocumentMock).not.toHaveBeenCalled();
    },
  );

  it('rejects missing pages and always destroys the worker', async () => {
    const { task, pdf } = setupPdf();
    await expect(renderPdfPreview(bytes, 5)).rejects.toThrow('does not exist');
    expect(pdf.getPage).not.toHaveBeenCalled();
    expect(task.destroy).toHaveBeenCalledOnce();
  });

  it('does not create a worker for an already-cancelled request', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(renderPdfPreview(bytes, 1, controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(getDocumentMock).not.toHaveBeenCalled();
  });

  it('cancels rendering and releases the page and worker when aborted', async () => {
    const { page, renderTask, task } = setupPdf();
    const controller = new AbortController();
    let rejectRender: (error: Error) => void = () => undefined;
    renderTask.promise = new Promise<void>((_, reject) => {
      rejectRender = reject;
    });
    renderTask.cancel.mockImplementation(() => rejectRender(new Error('render cancelled')));
    page.render.mockImplementation(() => {
      queueMicrotask(() => controller.abort());
      return renderTask;
    });
    await expect(renderPdfPreview(bytes, 1, controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(renderTask.cancel).toHaveBeenCalledOnce();
    expect(page.cleanup).toHaveBeenCalledOnce();
    expect(task.destroy).toHaveBeenCalledOnce();
  });

  it('releases the worker when rendering fails', async () => {
    const { page, task } = setupPdf();
    page.render.mockImplementation(() => {
      throw new Error('unsupported drawing');
    });
    await expect(renderPdfPreview(bytes)).rejects.toThrow('unsupported drawing');
    expect(page.cleanup).toHaveBeenCalledOnce();
    expect(task.destroy).toHaveBeenCalledOnce();
  });
});
