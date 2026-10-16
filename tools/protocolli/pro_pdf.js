// Uso: node pro_pdf.js <file.html> <file.pdf>  (richiede playwright; logo.png accanto all'HTML)
const path = require('path'), fs = require('fs');
const { chromium } = require(process.env.PW || 'playwright');
(async () => {
  const html = path.resolve(process.argv[2]);
  const logo = fs.readFileSync(path.join(path.dirname(html), 'logo.png')).toString('base64');
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file://' + html); await p.waitForTimeout(800);
  const header = `<div style="-webkit-print-color-adjust:exact;width:100%;margin:0;background:#29235C;height:14mm;display:flex;align-items:center;justify-content:space-between;padding:0 15mm;font-family:'Open Sans',sans-serif">
    <img src="data:image/png;base64,${logo}" style="height:7mm;background:#fff;border-radius:1.5mm;padding:1mm 2mm">
    <span style="color:#FADC00;font-weight:800;font-size:8pt;letter-spacing:.05em">PROTOCOLLO PER PROFESSIONISTI SANITARI · DOLORE MUSCOLOSCHELETRICO CRONICO</span></div>`;
  const footer = `<div style="width:100%;padding:0 15mm;font-family:'Open Sans',sans-serif;font-size:7pt;color:#555772;display:flex;justify-content:space-between">
    <span><b style="color:#29235C">Equistasi S.r.l.</b> · Documento tecnico per uso formativo professionale · Rev. 1 – ottobre 2026</span>
    <span>pagina <span class="pageNumber"></span> di <span class="totalPages"></span></span></div>`;
  await p.pdf({ path: process.argv[3], format: 'A4', printBackground: true, displayHeaderFooter: true, headerTemplate: header, footerTemplate: footer,
    margin: { top: '22mm', bottom: '16mm', left: '0', right: '0' } });
  await b.close();
})();
