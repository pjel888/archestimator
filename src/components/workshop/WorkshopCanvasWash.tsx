/**
 * Server-rendered wash marker. CSS on [data-workshop-page-shell-root]:has(...)
 * copies --workshop-page-canvas-wash onto the layout-owned shell so
 * WorkshopGlassBackdrop inherits without a client classList sync.
 */
export function WorkshopCanvasWash({ className }: { className?: string }) {
  if (!className) return null;
  return <div className={className} data-workshop-canvas-wash="" hidden aria-hidden="true" />;
}
