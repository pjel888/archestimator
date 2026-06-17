"use client";

import { SC_SIDEBAR_GLASS_FILTER_ID } from "./useLiquidGlassRefraction";

type SidebarGlassFilterProps = {
  /**
   * When true, add a faint chromatic-aberration split (R/G/B displaced at
   * slightly different scales and recombined). Default false → the simple
   * blur + displacement + saturate path.
   */
  aberration?: boolean;
};

const OFFSCREEN_SVG_STYLE = {
  position: "absolute" as const,
  width: 0,
  height: 0,
  overflow: "hidden",
  pointerEvents: "none" as const,
};

/**
 * Inline SVG defining the single `<filter id="sc-sidebar-glass">` used by the
 * sidebar panel's `backdrop-filter` on desktop Chromium. Because it backs a
 * `backdrop-filter`, the filter operates on the rendered backdrop and must itself
 * provide the frost (blur) + saturation + displacement — there is no separate
 * `backdrop-filter: blur()` in the subtree.
 *
 * Pipeline (default):
 *   feTurbulence (fractalNoise) → noise
 *   feGaussianBlur (SourceGraphic, ~8) → frost
 *   feDisplacementMap (frost ⨯ noise, scale 16) → refracted
 *   feColorMatrix saturate(1.35)
 *
 * Rendered ONLY when refraction is enabled (see useLiquidGlassRefraction).
 */
export default function SidebarGlassFilter({ aberration = false }: SidebarGlassFilterProps) {
  return (
    <svg aria-hidden="true" focusable="false" width={0} height={0} style={OFFSCREEN_SVG_STYLE}>
      <defs>
        <filter
          id={SC_SIDEBAR_GLASS_FILTER_ID}
          x="-10%"
          y="-10%"
          width="120%"
          height="120%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.012"
            numOctaves={2}
            seed={7}
            result="noise"
          />
          <feGaussianBlur in="SourceGraphic" stdDeviation={8} result="frost" />

          {aberration ? (
            <>
              {/* Isolate channels, displace each at a slightly different scale,
                  then recombine with screen blends for a faint color split. */}
              <feColorMatrix
                in="frost"
                type="matrix"
                values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
                result="frostR"
              />
              <feColorMatrix
                in="frost"
                type="matrix"
                values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
                result="frostG"
              />
              <feColorMatrix
                in="frost"
                type="matrix"
                values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
                result="frostB"
              />
              <feDisplacementMap
                in="frostR"
                in2="noise"
                scale={16}
                xChannelSelector="R"
                yChannelSelector="G"
                result="dispR"
              />
              <feDisplacementMap
                in="frostG"
                in2="noise"
                scale={14}
                xChannelSelector="R"
                yChannelSelector="G"
                result="dispG"
              />
              <feDisplacementMap
                in="frostB"
                in2="noise"
                scale={18}
                xChannelSelector="R"
                yChannelSelector="G"
                result="dispB"
              />
              <feBlend in="dispR" in2="dispG" mode="screen" result="dispRG" />
              <feBlend in="dispRG" in2="dispB" mode="screen" result="displaced" />
            </>
          ) : (
            <feDisplacementMap
              in="frost"
              in2="noise"
              scale={16}
              xChannelSelector="R"
              yChannelSelector="G"
              result="displaced"
            />
          )}

          <feColorMatrix in="displaced" type="saturate" values="1.35" />
        </filter>
      </defs>
    </svg>
  );
}
