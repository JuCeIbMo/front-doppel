/**
 * The landing's cast, drawn once and reused with <use>: the owner, the employee Doppel
 * puts in their WhatsApp, and the aguayo cloth both of them wear. Every figure has its
 * origin at the feet, so a scene places a person by where they stand.
 */

/** Every shape's thick ink outline, set on the shape itself so it also holds inside a <use>. */
export const LN = { stroke: "#231A16", strokeWidth: 3.5, strokeLinejoin: "round", strokeLinecap: "round" } as const;

const SKIN_OWNER = "#C98B5B";
const SKIN_EMPLOYEE = "#8D5A3B";

/** Rendered once per page; every scene's drawings point at these ids. */
export function FigureDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true">
      <defs>
        <pattern id="aguayo" width="12" height="24" patternUnits="userSpaceOnUse">
          <rect width="12" height="5" fill="#C8102E" />
          <rect width="12" height="3" y="5" fill="#F2A900" />
          <rect width="12" height="5" y="8" fill="#0E7C4A" />
          <rect width="12" height="3" y="13" fill="#D0356B" />
          <rect width="12" height="5" y="16" fill="#2B2D84" />
          <rect width="12" height="3" y="21" fill="#FBF7F2" />
        </pattern>

        <g id="owner-figure">
          <path d="M-24 -64 H24 L21 -2 H4 L0 -40 L-4 -2 H-21Z" fill="#231A16" {...LN} />
          <path d="M-32 -60 Q-33 -118 0 -121 Q33 -118 32 -60Z" fill="#2B2D84" {...LN} />
          <circle cx="0" cy="-143" r="23" fill={SKIN_OWNER} {...LN} />
          <path
            d="M-22 -148 Q-16 -176 12 -168 Q22 -164 22 -150 Q12 -158 0 -156 Q-12 -154 -22 -148Z"
            fill="#231A16"
            {...LN}
          />
          <ellipse className="blink" cx="-8" cy="-142" rx="2.8" ry="3.6" fill="#231A16" />
          <ellipse className="blink" cx="8" cy="-142" rx="2.8" ry="3.6" fill="#231A16" />
          <path d="M-7 -131 q7 6 14 0" {...LN} fill="none" strokeWidth="2.5" />
        </g>

        {/* The employee: yellow cap, green polo, an aguayo apron and a headset for the calls. */}
        <g id="employee-figure">
          <path d="M-24 -64 H24 L21 -2 H4 L0 -40 L-4 -2 H-21Z" fill="#231A16" {...LN} />
          <path d="M-32 -60 Q-33 -118 0 -121 Q33 -118 32 -60Z" fill="#0E7C4A" {...LN} />
          <path d="M-18 -108 H18 L21 -58 H-21Z" fill="url(#aguayo)" {...LN} strokeWidth="2.5" />
          <circle cx="0" cy="-143" r="23" fill={SKIN_EMPLOYEE} {...LN} />
          <path d="M-24 -148 Q-24 -176 0 -176 Q24 -176 24 -148Z" fill="#F2A900" {...LN} />
          <path d="M6 -150 H36 Q36 -143 28 -143 H6Z" fill="#F2A900" {...LN} strokeWidth="2.5" />
          <ellipse className="blink" cx="-8" cy="-139" rx="2.8" ry="3.6" fill="#231A16" />
          <ellipse className="blink" cx="8" cy="-139" rx="2.8" ry="3.6" fill="#231A16" />
          <path d="M-8 -129 q8 8 16 0" {...LN} fill="none" strokeWidth="2.5" />
          <path d="M-23 -142 q-4 16 12 20" {...LN} fill="none" strokeWidth="2.5" />
          <circle cx="-10" cy="-122" r="3.5" fill="#D0356B" {...LN} strokeWidth="2" />
        </g>

        <path
          id="sparkle"
          d="M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8Z"
          fill="#FBF7F2"
          stroke="#231A16"
          strokeWidth="1.5"
        />
      </defs>
    </svg>
  );
}

/** The employee's arm holding a phone up to reply, tapping while it works. */
export function PhoneArm() {
  return (
    <g className="tap">
      <path d="M-30 -104 L-44 -84" {...LN} strokeWidth="9" />
      <path d="M-30 -104 L-44 -84" stroke="#0E7C4A" strokeWidth="4" strokeLinecap="round" />
      <rect x="-58" y="-106" width="22" height="34" rx="4" fill="#2B2D84" {...LN} strokeWidth="2.5" />
    </g>
  );
}

export function Sparkle({ x, y, delay = 0 }: { x: number; y: number; delay?: number }) {
  return <use href="#sparkle" className="twinkle" x={x} y={y} style={{ animationDelay: `${delay}s` }} />;
}

/** A shop counter wrapped in aguayo. */
export function Counter({ x, y, width, height = 80 }: { x: number; y: number; width: number; height?: number }) {
  return (
    <>
      <rect x={x} y={y} width={width} height={height} rx="6" fill="#C8102E" {...LN} />
      <rect x={x} y={y + 14} width={width} height="16" fill="url(#aguayo)" {...LN} strokeWidth="2.5" />
    </>
  );
}
