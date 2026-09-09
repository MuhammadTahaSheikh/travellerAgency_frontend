import html2pdf from 'html2pdf.js';

export type PdfDownloadOptions = {
  filename: string;
  orientation?: 'portrait' | 'landscape';
};

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

export async function downloadHtmlAsPdf(html: string, options: PdfDownloadOptions): Promise<void> {
  const orientation = options.orientation ?? 'landscape';
  // Portrait A4 printable width is ~190mm. Keep the capture canvas at that
  // size so wide tables cannot overflow and get clipped on the right.
  const renderWidth = orientation === 'portrait' ? 720 : 1200;

  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${renderWidth}px;min-height:800px;background:#ffffff;pointer-events:none;z-index:2147483646;overflow:hidden;`;
  document.body.appendChild(host);

  const iframe = document.createElement('iframe');
  iframe.style.cssText = `width:${renderWidth}px;min-height:800px;border:none;background:#fff;overflow:hidden;`;
  host.appendChild(iframe);

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(host);
    throw new Error('Could not render PDF');
  }

  doc.open();
  doc.write(html);
  doc.close();
  doc.documentElement.style.width = `${renderWidth}px`;
  doc.documentElement.style.maxWidth = `${renderWidth}px`;
  doc.documentElement.style.overflow = 'hidden';
  doc.body.style.width = `${renderWidth}px`;
  doc.body.style.maxWidth = `${renderWidth}px`;
  doc.body.style.overflow = 'hidden';
  await waitForRender(iframe);
  // Allow embedded base64 logos and SVG icons to finish decoding before capture.
  await new Promise<void>((resolve) => window.setTimeout(resolve, orientation === 'portrait' ? 800 : 400));

  const element = doc.body;
  if (!element) {
    document.body.removeChild(host);
    throw new Error('Could not render PDF');
  }

  try {
    const pdfOptions = {
      margin: orientation === 'portrait' ? [8, 8, 8, 8] : [8, 8, 8, 8],
      filename: ensurePdfFilename(options.filename),
      image: { type: 'png', quality: 1 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        width: renderWidth,
        windowWidth: renderWidth,
        backgroundColor: '#ffffff',
        imageTimeout: 15000,
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation,
      },
      pagebreak: { mode: ['css', 'legacy'] },
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
