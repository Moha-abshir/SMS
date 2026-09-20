/**
 * Dedicated, reliable print utility that isolates printable documents inside an invisible iframe.
 * Prevents blank print previews caused by React app parent CSS (overflow: hidden, position: fixed, flex, #root display:none, etc.)
 */
export function printElement(elementOrId: string | HTMLElement, title: string = 'Print Document') {
  const element = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
  if (!element) {
    window.print();
    return;
  }

  // Remove existing print iframe if any
  const existingFrame = document.getElementById('sms-print-iframe');
  if (existingFrame) {
    existingFrame.remove();
  }

  // Create an invisible iframe attached directly to document.body
  const iframe = document.createElement('iframe');
  iframe.id = 'sms-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const frameDoc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!frameDoc) {
    window.print();
    return;
  }

  // Collect style tags and font stylesheets from parent document
  const styleTags = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((tag) => tag.outerHTML)
    .join('\n');

  frameDoc.open();
  frameDoc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <base href="${window.location.origin}/" />
        <title>${title}</title>
        ${styleTags}
        <style>
          @page {
            size: A4 portrait;
            margin: ${(element.id === 'contract-document' || element.id === 'leave-slip-printable') ? '0' : '12mm 15mm'};
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: 'Times New Roman', Times, serif;
          }
          .no-print {
            display: none !important;
          }
          /* Ensure contract document has top space twice that of sides regardless of printer margin settings */
          #contract-document {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 30mm 15mm 20mm 15mm !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-sizing: border-box !important;
          }
          /* Ensure leave out slip matches physical stationery margins */
          #leave-slip-printable {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 20mm 15mm 20mm 15mm !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-size: 11.5pt !important;
            line-height: 1.6 !important;
            box-sizing: border-box !important;
          }
          /* Other printable sheets stretch naturally */
          #official-letter-paper,
          .printable-sheet,
          .printable-sheet-container {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          /* Prevent awkward page breaks */
          h1, h2, h3, h4 {
            page-break-after: avoid;
            break-after: avoid;
          }
          table, tr, td, th {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .signature-block, [style*="border-top"] {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        </style>
      </head>
      <body>
        ${element.outerHTML}
      </body>
    </html>
  `);
  frameDoc.close();

  // Wait for images (e.g. school logo crest) to load before triggering print dialog
  const images = frameDoc.querySelectorAll('img');
  let loaded = 0;
  const total = images.length;

  const trigger = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      window.print();
    }
  };

  if (total === 0) {
    setTimeout(trigger, 150);
  } else {
    let fired = false;
    const checkAllLoaded = () => {
      loaded++;
      if (loaded >= total && !fired) {
        fired = true;
        setTimeout(trigger, 150);
      }
    };

    images.forEach((img) => {
      if (img.complete && img.naturalHeight !== 0) {
        checkAllLoaded();
      } else {
        img.onload = checkAllLoaded;
        img.onerror = checkAllLoaded;
      }
    });

    // Fallback in case image takes longer
    setTimeout(() => {
      if (!fired) {
        fired = true;
        trigger();
      }
    }, 800);
  }
}
