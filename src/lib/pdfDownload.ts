import html2pdf from 'html2pdf.js';

export type PdfDownloadOptions = {
  filename: string;
  orientation?: 'portrait' | 'landscape';
};

const MARGIN_MM = 8;
const MM_TO_PX = 96 / 25.4;

function ensurePdfFilename(filename: string) {
  return filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
}

function waitForRender(iframe: HTMLIFrameElement) {
  return new Promise<void>((resolve) => {
    iframe.onload = () => resolve();
    window.setTimeout(resolve, 300);
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function pageInnerPx(orientation: 'portrait' | 'landscape') {
  const pageWmm = orientation === 'portrait' ? 210 : 297;
  const pageHmm = orientation === 'portrait' ? 297 : 210;
  return {
    width: Math.floor((pageWmm - MARGIN_MM * 2) * MM_TO_PX),
    height: Math.floor((pageHmm - MARGIN_MM * 2) * MM_TO_PX),
  };
}

/** If a section would be cut by a page slice, push the whole block to the next page. */
function keepSectionsOnOnePage(root: HTMLElement, pageHeightPx: number) {
  const sections = Array.from(root.querySelectorAll<HTMLElement>('.keep-together'));
  for (const el of sections) {
    const origin = root.getBoundingClientRect().top;
    const rect = el.getBoundingClientRect();
    const top = rect.top - origin;
    const height = rect.height;
    if (height < 8 || height > pageHeightPx - 2) continue;

    const used = ((top % pageHeightPx) + pageHeightPx) % pageHeightPx;
    const remaining = pageHeightPx - used;
    if (height <= remaining + 1) continue;

    const pad = el.ownerDocument.createElement('div');
    pad.setAttribute('data-pdf-page-push', 'true');
    pad.style.cssText = `display:block;width:100%;height:${Math.ceil(remaining)}px;overflow:hidden;pointer-events:none;`;
    el.parentElement?.insertBefore(pad, el);
  }
}

export async function downloadHtmlAsPdf(html: string, options: PdfDownloadOptions): Promise<void> {
  const orientation = options.orientation ?? 'landscape';
  const inner = pageInnerPx(orientation);
  const renderWidth = inner.width;

  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${renderWidth}px;min-height:800px;background:#ffffff;pointer-events:none;z-index:2147483646;overflow:visible;`;
  document.body.appendChild(host);

  const iframe = document.createElement('iframe');
  iframe.style.cssText = `width:${renderWidth}px;min-height:800px;border:none;background:#fff;`;
  host.appendChild(iframe);

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(host);
    throw new Error('Could not render PDF');
  }

  doc.open();
  doc.write(html);
  doc.close();
  await waitForRender(iframe);
  await new Promise<void>((resolve) => window.setTimeout(resolve, orientation === 'portrait' ? 800 : 400));

  const element = (doc.getElementById('invoice-root') || doc.body) as HTMLElement;
  if (!element) {
    document.body.removeChild(host);
    throw new Error('Could not render PDF');
  }

  iframe.style.height = `${Math.max(800, element.scrollHeight + 40)}px`;
  keepSectionsOnOnePage(element, inner.height);

  try {
    const pdfOptions = {
      margin: [MARGIN_MM, MARGIN_MM, MARGIN_MM, MARGIN_MM],
      filename: ensurePdfFilename(options.filename),
      image: { type: 'png', quality: 1 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: renderWidth,
        backgroundColor: '#ffffff',
        imageTimeout: 15000,
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation,
      },
      pagebreak: { mode: [], before: [], after: [], avoid: [] },
    };

    const pdfBlob = (await html2pdf()
      .set(pdfOptions as never)
      .from(element)
      .outputPdf('blob')) as Blob;

    downloadBlob(pdfBlob, ensurePdfFilename(options.filename));
  } finally {
    document.body.removeChild(host);
  }
}
