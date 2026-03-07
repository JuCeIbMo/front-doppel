"use client";

import { motion } from "motion/react";
import { Button } from "@/components/ui/Button";

const headline = "Automatiza tu WhatsApp Business con IA";
const headlineWords = headline.split(" ");

const chatMessages = [
  { from: "customer", text: "Hola, tienen disponibilidad?" },
  { from: "bot", text: "Hola! Si, tenemos disponibilidad. En que te puedo ayudar?" },
  { from: "customer", text: "Quiero reservar para 4 personas" },
  { from: "bot", text: "Perfecto! Para cuando seria la reserva?" },
];

export function Hero() {
  const handleScrollToComo = () => {
    const section = document.getElementById("como-funciona");
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background radial gradient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(37,211,102,0.08)_0%,transparent_70%)] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 w-full pt-32 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left column — text */}
          <div>
            {/* Animated headline */}
            <h1 className="text-3xl md:text-5xl lg:text-7xl font-bold tracking-tight leading-tight">
              {headlineWords.map((word, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.4,
                    ease: [0.25, 0.4, 0, 1],
                    delay: i * 0.08,
                  }}
                  className="inline-block mr-[0.3em]"
                >
                  {word}
                </motion.span>
              ))}
            </h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.6,
                ease: [0.25, 0.4, 0, 1],
                delay: 0.6,
              }}
              className="text-lg md:text-xl text-text-secondary mt-6 max-w-lg"
            >
              Conecta tu numero en 2 minutos. Sin codigo. Sin complicaciones.
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.6,
                ease: [0.25, 0.4, 0, 1],
                delay: 0.8,
              }}
              className="flex flex-wrap gap-4 mt-10"
            >
              <Button href="/connect">Conectar mi WhatsApp</Button>
              <Button variant="secondary" onClick={handleScrollToComo}>
                Ver como funciona
              </Button>
            </motion.div>
          </div>

          {/* Right column — phone mockup */}
          <motion.div
            animate={{ y: [0, -12, 0] }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="flex justify-center"
          >
            <div className="relative w-[280px] md:w-[320px] h-[560px] md:h-[640px]">
              {/* Phone shell */}
              <div className="w-full h-full rounded-[3rem] border-2 border-white/10 bg-bg-secondary overflow-hidden shadow-2xl flex flex-col">
                {/* Notch */}
                <div className="flex justify-center pt-3 pb-2">
                  <div className="w-28 h-6 bg-black rounded-full" />
                </div>

                {/* Chat header */}
                <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent/30 flex items-center justify-center">
                    <span className="text-xs font-bold text-accent">D</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Doppel Bot</p>
                    <p className="text-xs text-accent">En linea</p>
                  </div>
                </div>

                {/* Chat messages */}
                <div className="flex-1 px-4 py-4 flex flex-col gap-3 overflow-hidden">
                  {chatMessages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.4,
                        ease: [0.25, 0.4, 0, 1],
                        delay: 1.0 + i * 0.3,
                      }}
                      className={`max-w-[85%] ${
                        msg.from === "customer" ? "self-start" : "self-end"
                      }`}
                    >
                      {msg.from === "bot" && (
                        <span className="text-[10px] text-accent/70 font-medium ml-3 mb-0.5 block">
                          Doppel
                        </span>
                      )}
                      <div
                        className={`rounded-2xl p-3 text-sm leading-relaxed ${
                          msg.from === "customer"
                            ? "bg-white/10 text-text-primary"
                            : "bg-accent/20 text-text-primary"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Input bar */}
                <div className="px-4 py-3 border-t border-white/5">
                  <div className="bg-white/5 rounded-full px-4 py-2 text-xs text-text-secondary">
                    Escribe un mensaje...
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
