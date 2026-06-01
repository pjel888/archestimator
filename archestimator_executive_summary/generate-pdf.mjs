import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import path from "node:path";

const root = path.dirname(new URL(import.meta.url).pathname);
const input = path.join(root, "index.html");
const output = path.join(root, "Archestimator Executive Summary.pdf");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1240, height: 1754 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(input).href, { waitUntil: "networkidle" });
await page.emulateMedia({ media: "print" });
await page.pdf({
  path: output,
  format: "A4",
  printBackground: true,
  margin: { top: "0", right: "0", bottom: "0", left: "0" },
});
await browser.close();

console.log(output);
