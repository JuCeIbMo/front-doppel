import { Plus } from "lucide-react";

/** What an owner asks before hiring; every answer is something the product does today. */
const QUESTIONS = [
  {
    q: "¿Tengo que saber de tecnología?",
    a: "No. Entras con tu correo, eliges si tu empleado vende, agenda o las dos cosas, y conectas tu WhatsApp con tu cuenta de Meta. Sin código.",
  },
  {
    q: "¿Decide cosas sin preguntarme?",
    a: "Lleva la conversación de principio a fin, pero antes de algo delicado, como un descuento, te pregunta por WhatsApp y espera tu respuesta.",
  },
  {
    q: "¿Sabe lo que vendo?",
    a: "Sí. Vende y agenda con tu catálogo, tu inventario, tus servicios y tus horarios reales, y cada venta o cita queda anotada.",
  },
  {
    q: "¿Dónde veo lo que hizo?",
    a: "En tu panel, desde el celular o la compu: las conversaciones, los pedidos, las citas y cada cosa que hizo tu empleado.",
  },
];

export function Questions() {
  return (
    <section aria-labelledby="preguntas" className="bg-paper px-5 py-20 md:px-10 md:py-28">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:gap-16">
        <h2
          id="preguntas"
          className="font-display text-[42px] leading-[0.9] font-black text-balance uppercase [font-stretch:72%] md:text-7xl"
        >
          Lo que te estarás preguntando
        </h2>
        <div className="flex flex-col gap-4">
          {QUESTIONS.map(({ q, a }) => (
            <details
              key={q}
              className="group rounded-2xl border-[3px] border-ink bg-white shadow-[4px_4px_0_var(--color-ink)] open:bg-[#D6EFE0]"
            >
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 text-lg font-extrabold md:text-xl [&::-webkit-details-marker]:hidden">
                {q}
                <span
                  className="grid size-9 flex-none place-items-center rounded-full border-[2.5px] border-ink bg-money transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-open:rotate-45"
                  aria-hidden="true"
                >
                  <Plus className="size-5" strokeWidth={3} />
                </span>
              </summary>
              <p className="px-5 pb-5 text-base leading-relaxed font-medium md:text-lg">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
