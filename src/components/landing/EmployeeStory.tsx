"use client";

import { useRef, useState, type ReactNode, type RefObject } from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { AudioLines, Phone, PhoneCall } from "lucide-react";
import { Counter, FigureDefs, LN, PhoneArm, Sparkle } from "./figures";

/**
 * The landing's story, told by scrolling: the owner drowning in messages, the employee
 * Doppel puts in their WhatsApp, and what it does (answers messages and calls, sells and
 * charges, books, and reports back). Each scene pins to the screen while its part of the
 * page scrolls by, and what happens in it follows how far you have scrolled, so going
 * back up undoes it. With reduced motion every scene shows its finished state.
 */
export function EmployeeStory() {
  return (
    <div className="landing">
      <FigureDefs />
      <ArrivalScene />
      <MessagesAndCallsScene />
      <SellScene />
      <BookScene />
      <ReportScene />
    </div>
  );
}

/* ── How a scene follows the scroll ── */

function useScene() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  return { ref, progress: scrollYProgress };
}

/** How many of a scene's beats the scroll has reached; all of them under reduced motion. */
function useBeats(progress: MotionValue<number>, marks: number[]): number {
  const reduce = useReducedMotion();
  const [reached, setReached] = useState(0);
  const count = (value: number) => marks.filter((mark) => value >= mark).length;
  useMotionValueEvent(progress, "change", (value) => setReached(count(value)));
  return reduce ? marks.length : reached;
}

/** A 0→1 value over part of a scene, eased out; already 1 under reduced motion. */
function useStretch(progress: MotionValue<number>, from: number, to: number) {
  const reduce = useReducedMotion();
  return useTransform(progress, (value) => {
    if (reduce) return 1;
    const k = Math.max(0, Math.min(1, (value - from) / (to - from)));
    return 1 - Math.pow(1 - k, 3);
  });
}

function Scene({
  sceneRef,
  className,
  label,
  children,
  drawing,
  stage = "top-[46%]",
}: {
  sceneRef: RefObject<HTMLElement | null>;
  className: string;
  label: string;
  children: ReactNode;
  drawing: ReactNode;
  /** On a phone, where the drawing's stage begins; the words may overlap it, like a comic. */
  stage?: string;
}) {
  return (
    <section ref={sceneRef} aria-label={label} className={`relative h-[260svh] ${className}`}>
      <div className="sticky top-0 h-svh overflow-hidden">
        <div className="relative mx-auto h-full max-w-7xl px-5 pt-24 md:px-12 md:pt-28 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-center lg:gap-12 lg:pb-12">
          <div className="relative z-10">{children}</div>
          <div
            className={`pointer-events-none absolute inset-x-5 bottom-24 flex items-end justify-center md:inset-x-12 md:bottom-12 lg:static lg:h-full lg:items-center ${stage}`}
          >
            {drawing}
          </div>
        </div>
      </div>
    </section>
  );
}

function Title({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={`font-display text-[40px] leading-[0.9] font-black text-balance uppercase [font-stretch:72%] md:text-[60px] lg:text-[80px] ${className}`}>
      {children}
    </h2>
  );
}

function Reveal({ on, children, className = "" }: { on: boolean; children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={false}
      animate={on ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 12, scale: 0.94 }}
      transition={{ duration: 0.35, ease: [0.2, 0.8, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

function Bubble({
  from,
  on,
  voice = false,
  children,
}: {
  from: "client" | "employee";
  on: boolean;
  /** Said out loud on a call rather than written. */
  voice?: boolean;
  children: ReactNode;
}) {
  const side =
    from === "client"
      ? "self-start rounded-bl-sm bg-white"
      : "self-end rounded-br-sm bg-[#D6EFE0]";
  return (
    <Reveal on={on} className={`max-w-[16rem] md:max-w-sm ${from === "client" ? "self-start" : "self-end"}`}>
      <p
        className={`rounded-2xl border-[2.5px] border-ink px-3.5 py-2.5 text-[15px] leading-snug font-semibold text-ink md:px-5 md:py-3.5 md:text-xl shadow-[3px_3px_0_var(--color-ink)] ${side}`}
      >
        {voice && (
          <span className="mb-1 flex items-center gap-1.5 text-xs font-extrabold tracking-wide uppercase md:text-sm">
            <AudioLines className="size-4 text-settled" strokeWidth={2.75} aria-hidden="true" />
            En la llamada
          </span>
        )}
        {children}
      </p>
    </Reveal>
  );
}

function Chat({ children }: { children: ReactNode }) {
  return <div className="mt-5 flex max-w-sm flex-col gap-2.5 md:mt-8 md:max-w-lg md:gap-4">{children}</div>;
}

/* ── 1 · The employee arrives ── */

function ArrivalScene() {
  const { ref, progress } = useScene();
  const beats = useBeats(progress, [0.45]);
  const arrive = useStretch(progress, 0.05, 0.5);
  const ownerX = useTransform(arrive, [0, 1], [0, -70]);
  const employeeX = useTransform(arrive, [0, 1], [170, 0]);
  const employeeOpacity = useTransform(arrive, [0, 0.5], [0, 1]);
  const phoneOpacity = useTransform(arrive, [0, 1], [1, 0]);
  const hintOpacity = useTransform(arrive, [0, 0.3], [1, 0]);

  return (
    <Scene
      sceneRef={ref}
      className="bg-money"
      label="Tu empleado completo"
      stage="top-[40%]"
      drawing={
        <svg viewBox="30 90 280 280" className="h-full max-h-[440px] w-full lg:max-h-none" aria-hidden="true">
          <Sparkle x={60} y={120} />
          <Sparkle x={280} y={140} delay={0.5} />
          <ellipse cx="170" cy="352" rx="150" ry="14" fill="#D99600" />
          <g transform="translate(250 350)">
            <motion.g style={{ x: employeeX, opacity: employeeOpacity }}>
              <use href="#employee-figure" />
              <PhoneArm />
            </motion.g>
          </g>
          <g transform="translate(170 350)">
            <motion.g style={{ x: ownerX }}>
              <use href="#owner-figure" />
              <motion.g style={{ opacity: phoneOpacity }}>
                <g className="buzz">
                  <rect x="30" y="-106" width="22" height="34" rx="4" fill="#2B2D84" {...LN} strokeWidth="2.5" />
                  <circle cx="52" cy="-106" r="12" fill="#C8102E" {...LN} strokeWidth="2.5" />
                  <text x="52" y="-102" textAnchor="middle" fontSize="11" fontWeight="900" fill="#fff">
                    37
                  </text>
                  <path d="M60 -88 q8 6 0 14 M66 -92 q12 10 0 22" {...LN} fill="none" strokeWidth="2.5" />
                </g>
              </motion.g>
              <motion.g style={{ opacity: arrive }}>
                <path d="M30 -96 h18 v18 q0 6 -6 6 h-6 q-6 0 -6 -6z" fill="#FBF7F2" {...LN} strokeWidth="2.5" />
                <path d="M36 -104 q3 -4 0 -8 M42 -104 q3 -4 0 -8" {...LN} fill="none" strokeWidth="2" />
              </motion.g>
            </motion.g>
          </g>
        </svg>
      }
    >
      {/* The question is what the owner lives with; the page's heading is the answer. */}
      <div className="grid">
        <motion.p
          className="font-display col-start-1 row-start-1 text-[42px] leading-[0.9] font-black text-balance uppercase [font-stretch:72%] md:text-[68px] lg:text-[96px]"
          initial={false}
          animate={beats >= 1 ? { opacity: 0, y: -12 } : { opacity: 1, y: 0 }}
        >
          ¿37 mensajes y 3 llamadas perdidas?
        </motion.p>
        <motion.div
          className="col-start-1 row-start-1"
          initial={false}
          animate={beats >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
        >
          <h1 className="font-display text-[42px] leading-[0.9] font-black text-balance uppercase [font-stretch:72%] md:text-[68px] lg:text-[96px]">
            Tu empleado completo, en tu WhatsApp
          </h1>
          <p className="mt-4 max-w-xs text-base font-semibold md:max-w-md md:text-2xl">
            Atiende, vende, agenda y cobra por ti. Tú solo decides.
          </p>
        </motion.div>
      </div>
      <motion.p style={{ opacity: hintOpacity }} className="nudge mt-6 text-sm font-extrabold md:text-base" aria-hidden="true">
        Baja ↓
      </motion.p>
    </Scene>
  );
}

/* ── 2 · Messages and calls ── */

function MessagesAndCallsScene() {
  const { ref, progress } = useScene();
  const beats = useBeats(progress, [0.08, 0.22, 0.38, 0.55, 0.62]);

  return (
    <Scene
      sceneRef={ref}
      className="bg-paper"
      label="Contesta mensajes y llamadas"
      stage="top-[68%] md:top-[56%]"
      drawing={
        <svg viewBox="150 60 200 190" className="h-full max-h-[380px] w-full lg:max-h-none" aria-hidden="true">
          <ellipse cx="250" cy="238" rx="80" ry="10" fill="#E6DCCF" />
          <g transform="translate(250 240)">
            <use href="#employee-figure" />
            <PhoneArm />
          </g>
        </svg>
      }
    >
      <Title>Contesta mensajes y llamadas</Title>
      <Chat>
        <Bubble from="client" on={beats >= 1}>¿Hasta qué hora abren?</Bubble>
        <Bubble from="employee" on={beats >= 2}>Hasta las 8. ¿Te guardo algo?</Bubble>
        <Reveal on={beats >= 3} className="self-start">
          <div className="relative w-56 overflow-hidden md:w-72 md:text-lg rounded-2xl border-[2.5px] border-ink font-extrabold shadow-[3px_3px_0_var(--color-ink)]">
            <CallRow tone="bg-steps" ringing icon={<Phone />} title="Llamada entrante" />
            <motion.div
              className="absolute inset-0"
              initial={false}
              animate={{ opacity: beats >= 4 ? 1 : 0 }}
            >
              <CallRow tone="bg-settled" icon={<PhoneCall />} title="Atendiendo · 00:42" />
            </motion.div>
          </div>
        </Reveal>
        <Bubble from="employee" on={beats >= 5} voice>
          «Sí, hoy tenemos de pollo y de carne.»
        </Bubble>
      </Chat>
    </Scene>
  );
}

function CallRow({
  tone,
  icon,
  title,
  ringing = false,
}: {
  tone: string;
  icon: ReactNode;
  title: string;
  ringing?: boolean;
}) {
  return (
    <div className={`flex h-full items-center gap-3 px-3.5 py-3 text-white ${tone}`}>
      <span
        className={`grid size-8 flex-none place-items-center rounded-full border-2 border-ink bg-paper text-ink [&>svg]:size-4 [&>svg]:stroke-[2.75] ${ringing ? "ringing" : ""}`}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span>
        {title}
        <small className="block text-xs font-semibold">Carlos · cliente</small>
      </span>
    </div>
  );
}

/* ── 3 · Sells and charges ── */

function SellScene() {
  const { ref, progress } = useScene();
  const beats = useBeats(progress, [0.08, 0.22, 0.36, 0.5, 0.64]);
  const sold = useStretch(progress, 0.64, 0.9);
  const total = useTransform(sold, (k) => `Bs ${Math.round(1240 + 360 * k).toLocaleString("es-BO")}`);

  return (
    <Scene
      sceneRef={ref}
      className="bg-waiting text-paper"
      label="Vende y cobra"
      stage="top-[56%]"
      drawing={
        <svg viewBox="140 30 210 276" className="h-full max-h-[420px] w-full lg:max-h-none" aria-hidden="true">
          {/* The sign hangs over the counter on a computer; a phone or tablet reads the ticket beside the stamp. */}
          <g className="max-lg:hidden">
            <path d="M240 20 L240 40 M310 20 L310 40" {...LN} />
            <rect x="206" y="40" width="128" height="58" rx="8" fill="#FBF7F2" {...LN} />
            <text x="270" y="59" textAnchor="middle" fontFamily="var(--font-archivo)" fontWeight="900" fontSize="10.5" letterSpacing="1.2" fill="#231A16">
              VENDIDO HOY
            </text>
            <motion.text x="270" y="88" textAnchor="middle" fontFamily="var(--font-kalam)" fontWeight="700" fontSize="26" fill="#2B2D84">
              {total}
            </motion.text>
          </g>
          <g transform="translate(250 300)">
            <use href="#employee-figure" />
            <PhoneArm />
          </g>
          <Counter x={150} y={212} width={190} height={92} />
          <motion.g initial={false} animate={{ opacity: beats >= 5 ? 1 : 0 }}>
            <rect x="178" y="186" width="36" height="28" rx="4" fill="#F2A900" {...LN} strokeWidth="2.5" />
            <rect x="214" y="190" width="30" height="24" rx="4" fill="#D0356B" {...LN} strokeWidth="2.5" />
          </motion.g>
        </svg>
      }
    >
      <Title>Vende y cobra</Title>
      <Chat>
        <Bubble from="client" on={beats >= 1}>¿Tienen la mochila roja?</Bubble>
        <Bubble from="employee" on={beats >= 2}>¡Sí! Bs 180, quedan 3. ¿Te la separo?</Bubble>
        <Bubble from="client" on={beats >= 3}>¡Quiero 2!</Bubble>
        <Bubble from="employee" on={beats >= 4}>Listo. Te mando el cobro: Bs 360.</Bubble>
      </Chat>
      <div className="mt-4 flex items-center gap-5">
        <Reveal on={beats >= 5} className="inline-block">
          <span className="font-display inline-block -rotate-6 border-[3px] border-paper bg-waiting px-3.5 py-2 text-2xl font-black tracking-wider [font-stretch:80%] md:text-4xl">
            PAGADO
          </span>
        </Reveal>
        <Reveal on={beats >= 1} className="lg:hidden">
          <p className="rotate-2 rounded-lg border-[3px] border-ink bg-paper px-3 py-1.5 text-center text-ink shadow-[3px_3px_0_var(--color-ink)]">
            <span className="font-display block text-[11px] font-black tracking-[0.12em]">VENDIDO HOY</span>
            <motion.span className="font-hand block text-2xl leading-tight font-bold text-steps">{total}</motion.span>
          </p>
        </Reveal>
      </div>
    </Scene>
  );
}

/* ── 4 · Books appointments ── */

const SLOTS = [
  { x: 160, y: 170, time: "16:00 ✓", fill: "#C8102E" },
  { x: 91, y: 100, time: "09:30", fill: "#0E7C4A" },
  { x: 22, y: 170, time: "15:00", fill: "#D0356B" },
  { x: 91, y: 205, time: "18:00", fill: "#2B2D84" },
  { x: 160, y: 100, time: "11:00", fill: "#0E7C4A" },
  { x: 91, y: 135, time: "12:30", fill: "#C8102E" },
];

function BookScene() {
  const { ref, progress } = useScene();
  const beats = useBeats(progress, [0.08, 0.24, 0.38, 0.48, 0.58, 0.68, 0.78, 0.88]);

  return (
    <Scene
      sceneRef={ref}
      className="bg-steps text-paper"
      label="Agenda tus citas"
      drawing={
        <svg viewBox="0 40 340 262" className="h-full max-h-[400px] w-full lg:max-h-none" aria-hidden="true">
          <rect x="14" y="60" width="210" height="190" rx="10" fill="#FBF7F2" {...LN} />
          <g fontFamily="var(--font-archivo)" fontWeight="900" fontSize="12" fill="#231A16" textAnchor="middle">
            <text x="50" y="84">MAR</text>
            <text x="119" y="84">MIÉ</text>
            <text x="188" y="84">JUE</text>
          </g>
          <path d="M84 70 V240 M154 70 V240 M22 92 H216" {...LN} strokeWidth="2" />
          <g fontWeight="800" fontSize="10" fill="#fff">
            <rect x="22" y="100" width="56" height="30" rx="5" fill="#2B2D84" {...LN} strokeWidth="2" />
            <text x="28" y="119">10:00</text>
            {SLOTS.map((slot, i) => (
              <motion.g
                key={slot.time + slot.x}
                initial={false}
                animate={beats >= i + 3 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.3 }}
                style={{ transformBox: "fill-box", transformOrigin: "center" }}
              >
                <rect x={slot.x} y={slot.y} width="56" height="30" rx="5" fill={slot.fill} {...LN} strokeWidth="2" />
                <text x={slot.x + 6} y={slot.y + 19}>{slot.time}</text>
              </motion.g>
            ))}
          </g>
          <g transform="translate(280 300)">
            <use href="#employee-figure" />
            <g className="write">
              <path d="M-30 -104 L-52 -118" {...LN} strokeWidth="9" />
              <path d="M-30 -104 L-52 -118" stroke="#0E7C4A" strokeWidth="4" strokeLinecap="round" />
              <path d="M-54 -120 L-70 -140" {...LN} stroke="#F2A900" strokeWidth="6" />
            </g>
          </g>
        </svg>
      }
    >
      <Title>Agenda tus citas solito</Title>
      <Chat>
        <Bubble from="client" on={beats >= 1}>¿Tienes turno el jueves a las 4?</Bubble>
        <Bubble from="employee" on={beats >= 2}>Listo, jueves 16:00 ✓ Te recuerdo un día antes.</Bubble>
      </Chat>
    </Scene>
  );
}

/* ── 5 · Reports to you ── */

const REPORT: { from: "employee" | "owner"; text: ReactNode }[] = [
  { from: "employee", text: <>Ana pide 10% de descuento en su pedido de <Money>Bs 360</Money>. ¿Le hago?</> },
  { from: "owner", text: "Dale" },
  { from: "employee", text: <>Listo ✓ Le cobré <Money>Bs 324</Money>.</> },
  { from: "owner", text: "¿Cuánto vendimos hoy?" },
  { from: "employee", text: <><Money>Bs 1.600</Money> · 9 pedidos · 2 citas mañana temprano.</> },
];

function Money({ children }: { children: ReactNode }) {
  return <b className="font-hand text-[17px] text-steps">{children}</b>;
}

function ReportScene() {
  const { ref, progress } = useScene();
  const beats = useBeats(progress, [0.04, 0.2, 0.32, 0.48, 0.64]);

  return (
    <Scene
      sceneRef={ref}
      className="bg-[#9FD3B8]"
      label="Te reporta a ti"
      drawing={
        <svg viewBox="0 30 340 142" className="w-full max-w-md lg:max-w-none" aria-hidden="true">
          <g transform="translate(92 170) scale(.8)">
            <use href="#owner-figure" />
            <rect x="30" y="-104" width="22" height="34" rx="4" fill="#2B2D84" {...LN} strokeWidth="2.5" />
          </g>
          <g transform="translate(240 170) scale(.75)">
            <path d="M-30 -60 Q-31 -112 0 -115 Q31 -112 30 -60Z" fill="#D0356B" {...LN} />
            <circle cx="0" cy="-136" r="22" fill="#B77A4E" {...LN} />
            <path d="M-24 -130 Q-26 -166 0 -164 Q26 -166 24 -130 L20 -140 Q0 -150 -20 -140Z" fill="#231A16" {...LN} />
            <path d="M-8 -126 q8 7 16 0" {...LN} fill="none" strokeWidth="2.5" />
          </g>
          <g transform="translate(176 132) scale(.55)">
            <path d="M-28 -60 Q-29 -104 0 -106 Q29 -104 28 -60Z" fill="#F2A900" {...LN} />
            <circle cx="0" cy="-126" r="22" fill="#C98B5B" {...LN} />
            <path d="M-20 -134 Q-10 -156 20 -138" {...LN} fill="#231A16" />
            <path d="M-8 -118 q8 8 16 0" {...LN} fill="none" strokeWidth="3" />
          </g>
          <Counter x={20} y={118} width={300} height={52} />
          <ellipse cx="128" cy="116" rx="30" ry="8" fill="#FBF7F2" {...LN} strokeWidth="2.5" />
        </svg>
      }
    >
      <Title>Y te reporta a ti</Title>
      <p className="mt-3 max-w-xs text-base font-semibold md:max-w-md md:text-2xl">Le escribes por WhatsApp como a tu mejor empleado.</p>
      <div className="mt-4 max-w-sm overflow-hidden rounded-2xl border-[3px] border-ink bg-[#EFE6DA] shadow-[5px_5px_0_var(--color-ink)] md:mt-6 md:max-w-md">
        <div className="flex items-center gap-2.5 border-b-[3px] border-ink bg-settled px-3 py-2 text-paper md:px-4 md:py-2.5">
          <svg viewBox="-30 -182 60 64" className="size-9 flex-none rounded-full border-2 border-ink bg-money md:size-11" aria-hidden="true">
            <use href="#employee-figure" />
          </svg>
          <p className="leading-tight">
            <span className="block font-extrabold md:text-lg">Tu empleado</span>
            <span className="block text-xs font-semibold md:text-sm">en línea</span>
          </p>
        </div>
        {/* A phone has no room to keep space for what is not said yet: the chat grows, and
            like a real one it keeps only the last few messages in view. */}
        <div className="flex flex-col gap-2 p-3 md:gap-3 md:p-4">
          {REPORT.map((message, i) => (
            <Reveal
              key={i}
              on={beats >= i + 1}
              className={`${message.from === "owner" ? "self-end" : "self-start"} ${beats >= i + 1 && i >= beats - 3 ? "" : "max-lg:hidden"}`}
            >
              <p
                className={`max-w-[15rem] rounded-xl border-2 border-ink px-3 py-2 text-sm leading-snug font-semibold md:max-w-xs md:px-4 md:py-2.5 md:text-lg ${
                  message.from === "owner" ? "bg-[#D6EFE0]" : "bg-white"
                }`}
              >
                {message.text}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </Scene>
  );
}
