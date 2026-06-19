/**
 * WorkshopGlassBackdrop
 *
 * A purely decorative, static, GPU-cheap warm-neutral mesh that sits behind all
 * workshop content. Its only job is to give the frosted-glass sidebar something
 * varied to refract/tint — glass only reads as glass over a non-flat backdrop.
 *
 * Tone is deliberately understated (PRODUCT.md / DESIGN.md: "precise,
 * architectural, understated"): barely-there warm paper with two soft tonal
 * blooms. No animation, no video, no images, no `will-change`, no
 * `backdrop-filter` (that belongs to the sidebar `<nav>`).
 *
 * Server-component-safe: no "use client", no hooks, no state.
 */

// Composed once at module scope so the same string is reused on every render.
// Layer order matters: gradients paint front-to-back (first listed is on top),
// and the flat base color is last so it fills everything behind the blooms.
const WORKSHOP_GLASS_MESH: string = [
  // Calm, near-flat grey canvas for the whole workshop. White/frosted surfaces
  // (sidebar, header bar, content cards, footer) float on top of this with soft
  // shadows. Kept very uniform — floating reads best over a quiet field.
  // Whisper-faint cool bloom upper-left behind the rail, just enough for the
  // frosted glass to catch a hint of depth.
  "radial-gradient(560px circle at 0% 1%, rgba(70,82,104,0.05), transparent 460px)",
  // Barely-there warm counterweight lower-right (brand family, near-subliminal).
  "radial-gradient(840px circle at 100% 100%, rgba(242,68,5,0.022), transparent 700px)",
  // Calm cool-grey base — distinct enough from white that surfaces clearly float.
  "#eef0f3",
].join(", ");

/**
 * Decorative fixed backdrop. Mount once near the top of the workshop `<main>`;
 * `-z-10` keeps it behind all `z-auto` workshop content.
 */
export function WorkshopGlassBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10"
      style={{ background: WORKSHOP_GLASS_MESH }}
    />
  );
}
