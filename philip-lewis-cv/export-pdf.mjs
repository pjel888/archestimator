import { chromium } from 'playwright';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const folder = dirname(fileURLToPath(import.meta.url));
const input = pathToFileURL(join(folder, 'index.html')).href;
const output = join(folder, 'Philip-Jon-Echavez-Lewis-CV.pdf');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 2200 } });

await page.goto(input, { waitUntil: 'networkidle' });
await page.pdf({
  path: output,
  format: 'A4',
  printBackground: true,
  preferCSSPageSize: true,
  margin: { top: '0', right: '0', bottom: '0', left: '0' },
});

await browser.close();
console.log(output);
