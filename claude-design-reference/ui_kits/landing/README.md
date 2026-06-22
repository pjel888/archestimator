# Landing UI kit — Marketing hero

The editorial public-page direction (exempt from the strict app system). Light, Intercom/Amigo-inspired, with the brand's loud register applied as accents.

**`index.html`** — the current landing:
- **Full-bleed three.js hero background** — a generative "cost-data structure" (orange wireframe towers on a light warm stage, gentle auto-rotation + mouse parallax). Loaded from three.js r128 (CDN), `preserveDrawingBuffer` on so the canvas is capturable. **No image files** are used anywhere on the page except the brand logo SVG.
- **Braun / liquid-glass overlay** — borrowed from the workshop dashboard: a frosted glass copy panel (backdrop-blur, thin border, specular top edge, SVG-noise grain) holds the Doto pixel headline, lede, and CTAs; floating frosted **glass stat chips** sit over the structure; a thin mono **HUD** layer adds gridlines, registration marks (✳), and `Fig. 01 / ● Live / Rev 3.0` labels.
- Below the fold (light, airy): segment strip · dark stats band · 5-step process · two product feature rows (HTML mockups — estimate sheet + Activity timeline, no images) · an approved brand pull-quote (no fabricated testimonials, per claims discipline) · capability cards · one bright signal-orange CTA band · light multi-column footer.
- Inter editorial scale + tight negative tracking; Doto pixel for hero/CTA/stat numerals; Roboto Mono eyebrows; signal orange `#F24405` as the single vivid accent. Copy is from the approved deployable copy pack (v4.3). No AI claims (AI is deferred).

**`index-classic.html`** — the previous calm clay/Inter split hero with the frosted construction photo. Kept for reference.

Reduced-motion safe (canvas rotation + reveals gate on `prefers-reduced-motion`).
