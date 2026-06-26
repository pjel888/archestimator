/**
 * WorkshopGlassBackdrop
 *
 * A purely decorative, static, GPU-cheap canvas wash that sits behind all
 * workshop content. Its only job is to give frosted-glass surfaces something
 * varied to refract/tint — glass only reads as glass over a non-flat backdrop.
 * Routes can override the wash through `--workshop-page-canvas-wash`.
 *
 * Tone is deliberately understated (PRODUCT.md / DESIGN.md: "precise,
 * architectural, understated"): barely-there tonal blooms over quiet grey. No
 * animation, no video, no images, no `will-change`, no `backdrop-filter` (that
 * belongs to the floating surfaces above it).
 *
 * Server-component-safe: no "use client", no hooks, no state.
 */

/**
 * Decorative fixed backdrop. Mount once near the top of the workshop `<main>`;
 * `-z-10` keeps it behind all `z-auto` workshop content.
 */
export function WorkshopGlassBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10"
      style={{ background: "var(--workshop-page-canvas-wash, var(--workshop-glass-backdrop-wash))" }}
    />
  );
}
