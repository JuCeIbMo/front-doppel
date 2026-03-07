"use client";

import { Button } from "@/components/ui/Button";

const confettiPieces = [
  { color: "bg-accent", top: "20%", left: "15%", delay: "0s", size: "w-2 h-2" },
  { color: "bg-white", top: "10%", left: "75%", delay: "0.1s", size: "w-1.5 h-1.5" },
  { color: "bg-green-300", top: "30%", left: "85%", delay: "0.2s", size: "w-2 h-2" },
  { color: "bg-accent", top: "15%", left: "40%", delay: "0.15s", size: "w-1 h-1" },
  { color: "bg-white", top: "25%", left: "60%", delay: "0.05s", size: "w-1.5 h-1.5" },
  { color: "bg-green-300", top: "35%", left: "25%", delay: "0.25s", size: "w-1 h-1" },
  { color: "bg-accent", top: "12%", left: "50%", delay: "0.3s", size: "w-2 h-2" },
  { color: "bg-white", top: "40%", left: "70%", delay: "0.12s", size: "w-1 h-1" },
  { color: "bg-green-300", top: "18%", left: "30%", delay: "0.22s", size: "w-1.5 h-1.5" },
  { color: "bg-accent", top: "28%", left: "90%", delay: "0.08s", size: "w-1 h-1" },
  { color: "bg-white", top: "8%", left: "20%", delay: "0.18s", size: "w-2 h-2" },
  { color: "bg-green-300", top: "22%", left: "55%", delay: "0.28s", size: "w-1.5 h-1.5" },
];

export default function SuccessPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      <style>{`
        @keyframes circle-draw {
          0% { stroke-dashoffset: 166; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes check-draw {
          0% { stroke-dashoffset: 48; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes confetti-burst {
          0% { transform: scale(0); opacity: 1; }
          50% { transform: scale(1); opacity: 1; }
          100% { transform: scale(0); opacity: 0; }
        }
        .circle-animate {
          stroke-dasharray: 166;
          stroke-dashoffset: 166;
          animation: circle-draw 0.6s ease-out 0.2s forwards;
        }
        .check-animate {
          stroke-dasharray: 48;
          stroke-dashoffset: 48;
          animation: check-draw 0.4s ease-out 0.8s forwards;
        }
        .confetti-piece {
          animation: confetti-burst 1.2s ease-out forwards;
        }
      `}</style>

      {/* Logo */}
      <a href="/" className="flex items-center gap-2 mb-12">
        <span className="text-xl font-bold text-text-primary">Doppel</span>
        <span className="inline-block w-2 h-2 rounded-full bg-accent" />
      </a>

      {/* Confetti */}
      <div className="absolute inset-0 pointer-events-none">
        {confettiPieces.map((piece, i) => (
          <span
            key={i}
            className={`absolute rounded-full ${piece.color} ${piece.size} confetti-piece`}
            style={{
              top: piece.top,
              left: piece.left,
              animationDelay: piece.delay,
            }}
          />
        ))}
      </div>

      {/* Animated check mark */}
      <div className="relative">
        <svg
          className="w-24 h-24"
          viewBox="0 0 52 52"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            className="circle-animate"
            cx="26"
            cy="26"
            r="25"
            fill="none"
            stroke="#25D366"
            strokeWidth="2"
          />
          <path
            className="check-animate"
            fill="none"
            stroke="#25D366"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.1 27.2l7.1 7.2 16.7-16.8"
          />
        </svg>
      </div>

      {/* Text */}
      <h1 className="text-3xl font-bold text-text-primary mt-8 text-center">
        Tu WhatsApp esta conectado!
      </h1>
      <p className="text-text-secondary mt-3 text-center max-w-md">
        En las proximas horas recibiras un mensaje de bienvenida en tu WhatsApp
      </p>

      {/* CTA */}
      <div className="mt-8">
        <Button variant="primary" href="/">
          Volver al inicio
        </Button>
      </div>
    </div>
  );
}
