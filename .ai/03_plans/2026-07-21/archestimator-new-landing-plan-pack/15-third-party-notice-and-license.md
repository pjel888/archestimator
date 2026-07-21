# Third-Party Notice and License Guidance

## Purpose

The page intentionally uses Velora UI as a structural reference and LaunchPad as an interaction reference. This document prevents “reference” from becoming untracked source copying.

It is implementation guidance, not legal advice.

## Velora UI

### Source

```text
Repository: https://github.com/ColorlibHQ/velora-ui
Website:    https://velora.colorlib.com/
```

### Observed license

The repository’s `LICENSE` file states an MIT License and identifies:

```text
Copyright (c) 2026 Aigars Silkalns
```

The MIT condition requires the copyright and permission notice to be included in copies or substantial portions of the software.

### Permitted approach

The implementation may:

- use Velora’s public page as a structural reference;
- copy or adapt MIT-licensed small primitives;
- modify those primitives for Archestimator;
- use them commercially subject to the license terms.

### Required handling when source is copied or substantially adapted

1. Retain the complete MIT notice in the repository’s relevant third-party notice or beside the adapted source.
2. Add a concise source comment at the adapted implementation, for example:

   ```ts
   // Adapted from Velora UI's MIT-licensed blur/reveal concept.
   // Copyright (c) 2026 Aigars Silkalns. See third-party notices.
   ```

3. Record:
   - upstream file path;
   - upstream revision;
   - local file path;
   - whether copied, adapted, or reimplemented.
4. Do not remove upstream attribution from copied comments.
5. Do not imply Archestimator authored the upstream primitive.

### Preferred approach for this plan

Reimplement the small effects from first principles using existing GSAP/CSS because:

- the repository does not have Velora’s Motion dependency;
- the desired behavior is simple;
- Archestimator needs a different light visual system;
- fewer copied lines reduce license and maintenance overhead.

Structural similarity alone does not require code copying.

## LaunchPad

### Source

```text
Repository: https://github.com/strapi/LaunchPad
Website:    https://launch-pad-roan.vercel.app/en
```

### License status in this planning pass

A root license file was not verified.

Therefore, the plan sets a strict boundary:

- interaction concepts only;
- no copied code;
- no copied assets;
- no copied images;
- no copied icons or 3D models;
- no copied content;
- no copied layout values;
- no copied Strapi data;
- no recognizable space/rocket motif.

Generic ideas such as “cards lift on hover” or “a section reveals as it enters the viewport” are reimplemented independently.

If an implementer later finds a specific licensed LaunchPad source file, do not change this boundary without documenting the license and owner decision.

## Archestimator source

The real hero demonstration is Archestimator repository source and should be reused directly. Do not extract internal application code into a public third-party-style copy.

The sanitized data remains illustrative. It must not be treated as third-party supplier endorsement.

## Dependency policy

Do not install:

- `motion`;
- `framer-motion`;
- Three.js;
- particle libraries;
- marquee libraries;
- external font packages;
- a second icon family.

A dependency addition is a material plan deviation and requires owner-visible justification.

## Third-party implementation log template

If any source is adapted, add a record to the completion report:

| Upstream | Revision | Upstream path | Local path | Relationship | Notice location |
|---|---|---|---|---|---|
| Velora UI |  |  |  | adapted/reimplemented |  |

If every effect is independently reimplemented, record:

```text
No third-party source code or assets copied. Velora used for structure and interaction study; LaunchPad used for conceptual motion cues only.
```

## Review checklist

- [ ] No LaunchPad source copied.
- [ ] No LaunchPad asset copied.
- [ ] No reference-site trademark used in rendered page.
- [ ] No Velora package dependency added.
- [ ] Any Velora code copy has MIT notice.
- [ ] Any adapted source has upstream revision.
- [ ] No third-party customer/logo content copied.
- [ ] No external image hotlink.
- [ ] No downloaded font added.
- [ ] Completion report states the actual relationship.

## Attribution placement

Do not place reference-template attribution in the customer-facing footer unless the owner wants it. License notices belong in repository documentation/source notices, not necessarily rendered marketing UI.

## No asset requirement

This plan requires no new external image. The product proof is real local UI, and supporting visuals are CSS/SVG/semantic markup. This eliminates image-license uncertainty and keeps the page product-led.
