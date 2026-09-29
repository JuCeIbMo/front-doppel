import { HireLink, LoginHint } from "./HireLink";
import { PhoneArm, Sparkle } from "./figures";

const STEPS = [
  "Entra con tu correo",
  "Elige qué hará: vender o agendar",
  "Conecta tu WhatsApp",
];

/** The close of the story: hiring the employee is three steps, and the button starts them. */
export function HireSteps() {
  return (
    <section id="contratar" aria-label="Contrátalo en 3 pasos" className="landing bg-money px-5 py-20 md:px-10 md:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2">
        <div>
          <h2 className="font-display text-[42px] leading-[0.9] font-black uppercase [font-stretch:72%] md:text-8xl">
            Contrátalo en 3 pasos
          </h2>
          <ol className="mt-8 flex flex-col gap-4">
            {STEPS.map((step, i) => (
              <li key={step} className="flex items-center gap-4 text-lg font-bold md:text-2xl">
                <span className="font-display grid size-12 flex-none place-items-center rounded-xl border-[3px] border-ink bg-paper text-2xl font-black shadow-[3px_3px_0_var(--color-ink)]">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <HireLink className="mt-10 inline-flex min-h-14 items-center justify-center rounded-2xl border-[3px] border-ink bg-ink px-6 text-lg font-extrabold text-paper shadow-[4px_4px_0_var(--color-waiting)] transition-transform hover:-translate-y-0.5 md:text-xl" />
          <LoginHint />
        </div>
        <svg viewBox="150 40 200 210" className="mx-auto hidden h-[60svh] max-h-[560px] w-full md:block" aria-hidden="true">
          <Sparkle x={170} y={70} />
          <Sparkle x={320} y={100} delay={0.6} />
          <ellipse cx="250" cy="238" rx="80" ry="10" fill="#D99600" />
          <g transform="translate(250 240)">
            <use href="#employee-figure" />
            <PhoneArm />
          </g>
        </svg>
      </div>
    </section>
  );
}
