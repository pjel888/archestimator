/**
 * Shared frosted-grain texture for the liquid-glass sidebar.
 *
 * SINGLE responsibility: expose a tiny, inline, URL-encoded SVG `feTurbulence`
 * noise tile as a ready-to-use CSS `background-image` value. The orchestrator
 * applies it to the sidebar `::after` overlay at `--glass-grain-opacity` (~0.04)
 * to give the frost a subtle physical grain.
 *
 * No logic, no other exports — just the single const the orchestrator imports.
 */

/**
 * 64x64 fractal-noise SVG, URL-encoded for safe inline use in CSS.
 *
 * Source SVG (decoded):
 *   <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
 *     <filter id="g">
 *       <feTurbulence type="fractalNoise" baseFrequency="0.9"
 *         numOctaves="2" stitchTiles="stitch"/>
 *     </filter>
 *     <rect width="64" height="64" filter="url(#g)"/>
 *   </svg>
 *
 * Encoding rules honored so the value is valid inside a CSS `url("...")`:
 * `<` → %3C, `>` → %3E, `#` → %23, `"` → %27 (single quotes), spaces → %20.
 */
export const GLASS_GRAIN_DATA_URI: string =
  'url("data:image/svg+xml,' +
  "%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2764%27%20height=%2764%27%3E" +
  "%3Cfilter%20id=%27g%27%3E" +
  "%3CfeTurbulence%20type=%27fractalNoise%27%20baseFrequency=%270.9%27%20numOctaves=%272%27%20stitchTiles=%27stitch%27/%3E" +
  "%3C/filter%3E" +
  "%3Crect%20width=%2764%27%20height=%2764%27%20filter=%27url(%23g)%27/%3E" +
  "%3C/svg%3E" +
  '")';
