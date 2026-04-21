import Link from "next/link";
import { Button } from "@/components/ui/Button";

const confettiPieces = [
  { color: "bg-accent", top: "20%", left: "15%", delay: "0s", size: "w-2 h-2" },
  { color: "bg-white", top: "10%", left: "75%", delay: "0.1s", size: "w-1.5 h-1.5" },
  { color: "bg-green-300", top: "30%", left: "85%", delay: "0.2s", size: "w-2 h-2" },
  { color: "bg-accent", top: "15%", left: "40%", delay: "0.15s", size: "w-1 h-1" },
  { color: "bg-white", top: "25%", left: "60%", delay: "0.05s", size: "w-1.5 h-1.5" },
  { color: "bg-green-300", top: "35%", left: "25%", delay: "0.25s", size: "w-1 h-1" },
];

type SuccessPageProps = {
  searchParams: Promise<{
    phone?: string;
    business?: string;
  }>;
};

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams;
  const phone = params.phone;
  const business = params.business;

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

      <Link href="/" className="flex items-center gap-2 mb-12">
        <span className="text-xl font-bold text-text-primary">Doppel</span>
        <span className="inline-block w-2 h-2 rounded-full bg-accent" />
      </Link>

      <div className="absolute inset-0 pointer-events-none">
        {confettiPieces.map((piece, i) => (
          <span
            key={i}
            className={`absolute rounded-full ${piece.color} ${piece.size} confetti-piece`}
            style={{ top: piece.top, left: piece.left, animationDelay: piece.delay }}
          />
        ))}
      </div>

      <div className="relative">
        <svg className="w-24 h-24" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle className="circle-animate" cx="26" cy="26" r="25" fill="none" stroke="#25D366" strokeWidth="2" />
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

      <h1 className="text-3xl font-bold text-text-primary mt-8 text-center">Tu WhatsApp ya esta conectado</h1>
      <p className="text-text-secondary mt-3 text-center max-w-md">
        {business ? `Negocio conectado: ${business}. ` : ""}
        {phone ? `Numero activo: ${phone}. ` : ""}
        Ya puedes terminar la configuracion del bot desde tu dashboard.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Button variant="primary" href="/dashboard">
          Ir al dashboard
        </Button>
        <Button variant="secondary" href="/">
          Volver al inicio
        </Button>
      </div>
    </div>
  );
}
