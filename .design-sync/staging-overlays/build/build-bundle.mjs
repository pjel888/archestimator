// Compile the new overlay components and splice them into a copy of the real
// _ds_bundle.js (read from the persisted get_file result), preserving format 3.
import fs from "node:fs";
import crypto from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Babel = require("/tmp/ds-babel/node_modules/@babel/standalone");

const ROOT = "/Users/philiplewis/Documents/archestimator/.design-sync/staging-overlays";
const COMP_DIR = `${ROOT}/components/overlays`;
const BUNDLE_SRC =
  process.env.HOME +
  "/.claude/projects/-Users-philiplewis-Documents-archestimator/3e71dc2b-46b0-4b32-af82-dbf7dbbff555/tool-results/toolu_01WwSxeDBPAeEQ6itz75T84C.txt";

// name, file, exported names, sourcePath in the project
const COMPONENTS = [
  { file: "Modal.jsx", exports: ["Modal"] },
  { file: "ConfirmDialog.jsx", exports: ["ConfirmDialog"] },
  { file: "Sheet.jsx", exports: ["Sheet"] },
  { file: "SettingsModal.jsx", exports: ["SettingsModal"] },
];

function stripModuleSyntax(src) {
  return src
    .split("\n")
    .filter((l) => !/^\s*import\s.*;?\s*$/.test(l))
    .map((l) => l.replace(/^\s*export\s+function\s/, "function ").replace(/^\s*export\s+const\s/, "const "))
    .filter((l) => !/^\s*export\s*\{[^}]*\}\s*;?\s*$/.test(l))
    .join("\n");
}

function compile(src) {
  const out = Babel.transform(stripModuleSyntax(src), {
    presets: [["react", { runtime: "classic", pure: true }]],
    compact: false,
  }).code;
  return out;
}

const EXTENDS_HELPER =
  "function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }";

const blocks = [];
const exposures = [];
const headerAdds = [];
const hashAdds = {};

for (const c of COMPONENTS) {
  const raw = fs.readFileSync(`${COMP_DIR}/${c.file}`, "utf8");
  const sourcePath = `components/overlays/${c.file}`;
  let compiled = compile(raw);
  const helper = compiled.includes("_extends(") ? EXTENDS_HELPER + "\n" : "";
  const assign = `Object.assign(__ds_scope, { ${c.exports.join(", ")} });`;
  const block =
    `// ${sourcePath}\n` +
    `try { (() => {\n` +
    helper +
    compiled +
    `\n${assign}\n` +
    `})(); } catch (e) { __ds_ns.__errors.push({ path: ${JSON.stringify(sourcePath)}, error: String((e && e.message) || e) }); }\n`;
  blocks.push(block);
  for (const name of c.exports) {
    exposures.push(`__ds_ns.${name} = __ds_scope.${name};`);
    headerAdds.push({ name, sourcePath });
  }
  hashAdds[sourcePath] = crypto.createHash("sha256").update(raw).digest("hex").slice(0, 12);
}

// ---- read & parse the real bundle ----
const obj = JSON.parse(fs.readFileSync(BUNDLE_SRC, "utf8"));
let bundle = obj.content;

// 1) update the @ds-bundle header JSON
const headerMatch = bundle.match(/^\/\* @ds-bundle: (\{[\s\S]*?\}) \*\//);
if (!headerMatch) throw new Error("header not found");
const meta = JSON.parse(headerMatch[1]);
for (const a of headerAdds) {
  if (!meta.components.some((x) => x.name === a.name)) meta.components.push({ name: a.name, sourcePath: a.sourcePath });
}
Object.assign(meta.sourceHashes, hashAdds);
const newHeader = `/* @ds-bundle: ${JSON.stringify(meta)} */`;
bundle = bundle.replace(headerMatch[0], newHeader);

// 2) splice component blocks before the first ui_kit block
const anchor = "\n// ui_kits/dashboard/Dashboard.jsx\n";
if (!bundle.includes(anchor)) throw new Error("ui_kits anchor not found");
bundle = bundle.replace(anchor, "\n" + blocks.join("\n") + anchor);

// 3) add exposure lines after the last existing exposure
const expAnchor = "__ds_ns.FinancialTotalCard = __ds_scope.FinancialTotalCard;\n";
if (!bundle.includes(expAnchor)) throw new Error("exposure anchor not found");
bundle = bundle.replace(expAnchor, expAnchor + "\n" + exposures.join("\n\n") + "\n");

fs.writeFileSync(`${ROOT}/_ds_bundle.js`, bundle);
console.log("wrote _ds_bundle.js", bundle.length, "chars");
console.log("added components:", headerAdds.map((a) => a.name).join(", "));
console.log("exposures:", exposures.length);
