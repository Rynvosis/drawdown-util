// PDF export via the browser's print engine.
//
// Why print instead of a JS PDF library: the report tables are tall and the
// hard requirement is that a row is never split across a page boundary. The
// print engine handles that natively (`break-inside: avoid` on rows, repeated
// `<thead>` per page) far more reliably than canvas-based PDF libraries, and it
// adds no dependencies. "Save as PDF" in the print dialog produces the file.
//
// Orientation is toggled by injecting an `@page { size: A4 <orientation> }`
// rule — CSS `@page` can't be switched by class, so we rewrite the rule before
// printing. A4 is assumed (UK client).

export function initPdfExport() {
  const btn = document.getElementById('exportPdfBtn');
  const orientationSel = document.getElementById('pdfOrientation');
  if (!btn || !orientationSel) return;

  // Persistent <style> whose only job is to carry the @page size rule.
  const pageStyle = document.createElement('style');
  pageStyle.id = 'print-page-size';
  document.head.appendChild(pageStyle);

  function applyOrientation() {
    const orientation = orientationSel.value === 'portrait' ? 'portrait' : 'landscape';
    pageStyle.textContent = `@page { size: A4 ${orientation}; margin: 12mm; }`;
    // Portrait A4 is too narrow for the wide transaction tables at the default
    // size, so the print stylesheet tightens font/padding under this class to
    // keep every column on the page. Landscape keeps the roomier sizing.
    document.documentElement.classList.toggle('print-portrait', orientation === 'portrait');
  }

  orientationSel.addEventListener('change', applyOrientation);
  applyOrientation();

  btn.addEventListener('click', () => {
    applyOrientation();
    window.print();
  });
}
