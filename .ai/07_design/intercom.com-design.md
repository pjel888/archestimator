---
version: alpha
name: Intercom Minimal Editorial
description: A clean, high-contrast SaaS system pairing editorial typography with restrained black-and-white UI chrome.
colors:
  primary: "#000000"
  secondary: "#111111"
  tertiary: "#6B7280"
  neutral: "#E5E7EB"
  surface: "#FFFFFF"
  on-surface: "#111111"
  background: "#FFFFFF"
  accent: "#000000"
  error: "#D92D20"
typography:
  headline-display:
    fontFamily: "Saans"
    fontSize: "64px"
    fontWeight: 400
    lineHeight: "77px"
    letterSpacing: "-0.03em"
  headline-lg:
    fontFamily: "Saans"
    fontSize: "45px"
    fontWeight: 400
    lineHeight: "54px"
    letterSpacing: "-0.03em"
  headline-md:
    fontFamily: "Saans"
    fontSize: "32px"
    fontWeight: 400
    lineHeight: "38px"
    letterSpacing: "-0.02em"
  headline-sm:
    fontFamily: "Saans"
    fontSize: "23px"
    fontWeight: 400
    lineHeight: "28px"
    letterSpacing: "-0.02em"
  body-lg:
    fontFamily: "Serrif"
    fontSize: "18px"
    fontWeight: 300
    lineHeight: "1.45"
    letterSpacing: "-0.01em"
  body-md:
    fontFamily: "Serrif"
    fontSize: "16px"
    fontWeight: 300
    lineHeight: "22.4px"
    letterSpacing: "-0.01em"
  body-sm:
    fontFamily: "Serrif"
    fontSize: "14px"
    fontWeight: 300
    lineHeight: "20px"
    letterSpacing: "-0.01em"
  label-lg:
    fontFamily: "Saans"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "1.2"
    letterSpacing: "-0.01em"
  label-md:
    fontFamily: "Saans"
    fontSize: "14px"
    fontWeight: 300
    lineHeight: "1.2"
    letterSpacing: "-0.01em"
  label-sm:
    fontFamily: "Saans"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "1.2"
    letterSpacing: "0.02em"
  nav-link:
    fontFamily: "Saans"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "1.2"
    letterSpacing: "-0.01em"
  button-text:
    fontFamily: "MediumLL"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "1.2"
    letterSpacing: "-0.01em"

# Product/workshop typography override
# The large Intercom/editorial sizes above are landing-page reference only.
# Outside `/`, app/workshop/product surfaces must use the compact Archestimator scale:
# - app-title: 12px max
# - app-subtitle: 11px
# - app-body, controls, buttons, table cells: 10px
# - eyebrow/meta labels: 8-9px
# Do not use 14px, 16px, 18px, or larger type in app/workshop UI unless Philip explicitly approves a one-off exception.

rounded:
  none: 0px
  sm: 4px
  md: 6px
  lg: 8px
  xl: 12px
  full: 9999px
spacing:
  xs: 12px
  sm: 20px
  md: 48px
  lg: 64px
  xl: 112px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.button-text}"
    rounded: "{rounded.md}"
    padding: "8px 10px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.surface}"
    typography: "{typography.button-text}"
    rounded: "{rounded.md}"
    padding: "8px 10px"
    height: "40px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.button-text}"
    rounded: "{rounded.sm}"
    padding: "8px 10px"
    height: "40px"
  button-secondary-hover:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface}"
    typography: "{typography.button-text}"
    rounded: "{rounded.sm}"
    padding: "8px 10px"
    height: "40px"
  button-link:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.none}"
    padding: "0px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: "16px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    padding: "12px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: "6px 10px"
  tab:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.tertiary}"
    typography: "{typography.nav-link}"
    rounded: "{rounded.none}"
    padding: "16px"
---

# Intercom Minimal Editorial

## Overview

This interface feels calm, sharp, and highly polished, with a strong editorial sensibility rather than a dense enterprise dashboard aesthetic. It is aimed at product-led SaaS buyers and support teams who need clarity, confidence, and fast scanning. The tone is professional but not cold: large type, generous white space, and minimal chrome create a premium, modern feel with a light sense of play in the image collage.

## Colors

- **Primary (#000000):** Pure black anchors the most important actions, headlines, and brand marks. It gives the interface its crisp, high-contrast character.
- **Secondary (#111111):** Near-black is used for body text and strong UI copy so the page feels slightly softer than pure black while remaining highly legible.
- **Tertiary (#6B7280):** A muted gray supports de-emphasized navigation, secondary labels, and passive states without competing with primary content.
- **Neutral (#E5E7EB):** A light border and divider tone that keeps cards and controls structured without introducing heavy shadows.
- **Surface (#FFFFFF):** White is the dominant canvas color, reinforcing openness, whitespace, and a clean editorial layout.
- **On-surface (#111111):** The primary readable text color on white surfaces, used for standard UI copy and secondary buttons.
- **Error (#D92D20):** Reserved for alerting, destructive, or invalid states; it should appear sparingly.
- **Background (#FFFFFF) / Accent (#000000):** The site is effectively monochrome, with black used as the only strong accent for CTAs and brand emphasis.

## Typography

The system pairs two distinct voices: **Saans** for headlines, navigation, labels, and interface text, and **Serrif** for body copy. Saans provides the clean geometric structure needed for a modern SaaS homepage, while Serrif adds editorial warmth in paragraphs and supporting descriptions. Headings are light-weight, large, and tightly tracked with negative letter spacing, especially at display sizes; body text is smaller, lighter, and comfortable to read. Button text uses Medium LL in the source styling, but can be treated as a compact sans-serif action style when implementing the system.

## Layout

The page uses a spacious, fluid desktop composition with a strong left-to-right hierarchy: navigation at the top, a large hero on the left, supporting copy and CTAs on the right, then a wide feature strip below. Spacing is generous and rhythmic, relying on large vertical gaps rather than dense module stacking. Use the spacing scale as a loose ladder: 12px for tight internal gaps, 20px for compact UI breathing room, 48px for section separation, 64px for larger breaks, and 112px for major visual transitions. Cards and feature panels should keep ample internal padding, typically around 16px or more, with content aligned to a broad max-width container and lots of negative space at the edges.

## Elevation & Depth

The system is intentionally flat. Instead of shadows, it relies on tonal contrast, thin borders, and whitespace to separate layers. Cards and controls use subtle 1px gray borders and white surfaces, while active CTA buttons invert to solid black for immediate emphasis. Depth in the hero area is created more by scale and placement than by drop shadow.

## Shapes

The shape language is restrained and architectural. Most elements use small corner radii: 4px for secondary buttons, 6px for primary buttons, and 8px for cards. The result is crisp and professional, with just enough softness to avoid feeling rigid. Full-pill shapes are reserved for chips or compact badges when needed.

## Components

Buttons are the strongest recurring component pattern. Use `button-primary` for black-filled calls to action with white text, 40px height, and 8px 10px padding. `button-secondary` is an outlined white button with dark text and a 1px border, suited to lower-priority actions such as View demo. `button-link` is a text-only action for top-level navigation or utility links; it should remain visually quiet and have no border or background. Hover states should stay subtle: for primary actions, shift slightly toward a softer black; for secondary actions, introduce a very light neutral fill rather than changing layout.

Cards should feel airy and content-first: white background, 1px neutral border, 8px radius, and modest padding. Inputs should follow the same light-border, white-surface approach, using the body-sm or label-md type style and a small radius. Tabs and segmented feature headings should remain simple and rectangular, with inactive states rendered in muted gray and active states using dark text on white.

If chips, pills, or compact status tokens are used, keep them minimal with full rounding and tight padding. Lists and menus should use clear typographic hierarchy rather than heavy separators. Interactive elements should avoid shadows and rely on contrast, border, and spacing to signal hierarchy.

## Do's and Don'ts

- Do keep the interface mostly monochrome, using black for the strongest emphasis and white for the primary canvas.
- Do use generous whitespace and large type to preserve the editorial, premium feel.
- Do prefer thin borders and surface contrast over shadows or layered depth.
- Do keep headline tracking tight and use light weights for a refined look.
- Don't introduce colorful accents unless they are strictly functional or brand-critical.
- Don't make buttons overly rounded, tall, or heavily padded; the system should stay compact and precise.
- Don't crowd sections with dense grids or too many competing modules.
- Don't use decorative effects, gradients, or heavy drop shadows that break the flat, minimal character.