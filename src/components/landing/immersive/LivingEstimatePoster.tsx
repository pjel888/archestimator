/**
 * Living Estimate poster — the static, server-rendered fallback for the
 * Living Estimate scene. An abstract composition: thin grouped plates, a
 * total band, a proposal plane, a review pin, a ghost plate, and the
 * signal-orange Cost Thread connecting them. It depicts the final
 * connected state (revision) so it matches the reduced-motion and
 * no-WebGL experience. No amounts, no fake sheet, no browser chrome.
 */
export function LivingEstimatePoster() {
  return (
    <svg
      viewBox="0 0 1200 760"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Abstract illustration of an estimate staying connected as it becomes a proposal, gathers feedback, and is revised"
      style={{ display: "block", width: "100%", height: "100%" }}
    >
      {/* Group header plates (graphite) */}
      <rect x={120} y={196} width={356} height={18} rx={4} fill="#3f4248" />
      <rect x={480} y={196} width={356} height={18} rx={4} fill="#3f4248" />
      <rect x={840} y={196} width={356} height={18} rx={4} fill="#3f4248" />

      {/* Row plates — three groups of four (warm paper) */}
      {[
        // Group 1
        { x: 128, y: 236 }, { x: 128, y: 276 }, { x: 128, y: 316 }, { x: 128, y: 356 },
        // Group 2
        { x: 488, y: 236 }, { x: 488, y: 276 }, { x: 488, y: 316 }, { x: 488, y: 356 },
        // Group 3 — first row is the reviewed row; it is lifted, so the
        // remaining three stay in place here.
        { x: 848, y: 276 }, { x: 848, y: 316 }, { x: 848, y: 356 },
      ].map((plate) => (
        <rect
          key={`${plate.x}-${plate.y}`}
          x={plate.x}
          y={plate.y}
          width={340}
          height={14}
          rx={3}
          fill="#ffffff"
          stroke="#e3e1da"
          strokeWidth={1}
        />
      ))}

      {/* Ghost plate — the reviewed row's prior position, preserved */}
      <rect x={848} y={236} width={340} height={14} rx={3} fill="#ffffff" stroke="#e3e1da" opacity={0.35} />

      {/* Reviewed row — lifted forward in the revision state */}
      <rect x={856} y={142} width={340} height={20} rx={3} fill="#ffffff" stroke="#d8d6cf" strokeWidth={1} />

      {/* Source markers (signal orange = source) */}
      <rect x={838} y={237} width={14} height={14} rx={3} fill="#f24405" />
      <rect x={1204} y={145} width={14} height={14} rx={3} fill="#f24405" />

      {/* Total band (graphite) */}
      <rect x={100} y={440} width={1060} height={20} rx={4} fill="#3f4248" />

      {/* Proposal plane — paper over a graphite backer */}
      <g transform="rotate(-6 1000 590)">
        <rect x={868} y={472} width={252} height={300} rx={6} fill="#3f4248" />
        <rect x={876} y={464} width={252} height={300} rx={6} fill="#fffdf9" stroke="#e3e1da" strokeWidth={1} />
      </g>

      {/* Review pin (signal orange = review) + connector to the lifted row */}
      <line x1={1062} y1={118} x2={1032} y2={148} stroke="#f24405" strokeWidth={3} strokeLinecap="round" />
      <path d="M 1062 96 L 1080 114 L 1062 132 L 1044 114 Z" fill="#f24405" />

      {/* Cost Thread — source row → total band → proposal plane → review pin */}
      <path
        d="M 1196 152
           C 1160 210, 1120 300, 1120 368
           C 1120 410, 1120 430, 1110 440
           C 1090 470, 1040 500, 1012 528
           C 990 550, 990 560, 1000 566
           C 1030 580, 1060 500, 1064 420
           C 1066 320, 1064 200, 1062 132"
        fill="none"
        stroke="#f24405"
        strokeWidth={5}
        strokeLinecap="round"
      />
    </svg>
  );
}
