# Codex prompt — Workshop Dashboard material textures

Run this **interactively in Codex** (the TUI, where the built-in `image_gen`
tool can save files — it does NOT persist files in headless `codex exec`).
Paste everything in the `PROMPT` block below into Codex from the repo root
(`/Users/philiplewis/Documents/archestimator`).

When the six files exist in `public/Cards/materials/`, flip the flag in
`src/components/workshop/dashboard/lib.ts`:

```ts
export const MATERIAL_PHOTOS_READY = true;
```

That single change swaps the destination tiles from the CSS material-tone
fallback to the real frosted-glass-over-photo treatment. No other code change is
needed — the components already point at `/Cards/materials/<material>.jpg`.

The filename → tile mapping the UI already expects:

| File | Used by |
| --- | --- |
| `timber.jpg` | Projects (big hero tile) |
| `steel.jpg` | Components |
| `concrete.jpg` | Templates |
| `aggregate.jpg` | Library hub (warm-tinted frost) |
| `rebar.jpg` | spare / future tile |
| `plywood.jpg` | spare / future tile |

---

## PROMPT (paste into Codex)

Generate SIX separate square images using your built-in `image_gen` tool (one
`image_gen` call per image), then save them into this repo. Working directory is
the repo root.

### Global style for ALL six (keep consistent)
- Use case: photorealistic-natural, macro material texture.
- Hyper-realistic extreme close-up / macro photograph of a real construction
  material, filling the entire frame edge to edge. No objects, no people, no
  tools, no text, no logos, no watermark.
- Square 1:1, 1024x1024.
- Even, soft, slightly raking directional light that reveals surface texture. No
  blown highlights, no crushed blacks — keep it mid-tone and evenly exposed.
- MUTED and slightly DESATURATED, calm and editorial. These sit UNDER a
  translucent frosted-white glass overlay in the UI, so they must read as quiet
  texture, not loud photography (architectural materials-library reference look).
- The texture is the subject and stays sharp across most of the frame.

### The six images
1. timber — raw sawn oak / Douglas-fir plank surface, warm natural wood,
   straight fine grain lines, subtle saw texture, a knot or two.
2. steel — brushed mild/stainless steel plate, cool neutral grey, fine
   horizontal brush/grind marks with faint warm oxidation patina in places.
3. concrete — raw board-formed architectural concrete, cool neutral grey, fine
   aggregate speckle and a faint horizontal form-board woodgrain imprint, a few
   small air pores.
4. rebar — a tight cluster of overlapping steel reinforcing bars, ribbed
   deformations, light orange surface rust, industrial, neutral background.
5. plywood — the layered edge / end-grain of birch plywood and OSB strand board,
   warm honey tones, visible glue lines and wood strands.
6. aggregate — crushed grey stone gravel / construction aggregate, neutral cool
   greys with subtle warm grains, even fill.

### After generating each image
Convert + resize each to an optimized 1024x1024 JPEG and place it at:
- `public/Cards/materials/timber.jpg`
- `public/Cards/materials/steel.jpg`
- `public/Cards/materials/concrete.jpg`
- `public/Cards/materials/rebar.jpg`
- `public/Cards/materials/plywood.jpg`
- `public/Cards/materials/aggregate.jpg`

Create `public/Cards/materials/` if needed. Use macOS `sips`, e.g.:
`sips -s format jpeg -s formatOptions 80 -z 1024 1024 "<source.png>" --out "public/Cards/materials/timber.jpg"`

### When done
List the six final repo paths and confirm each exists
(`ls -la public/Cards/materials/`). Do NOT edit any other files, do NOT touch
git, and do NOT use the CLI fallback (`scripts/image_gen.py`) — built-in
`image_gen` only.
