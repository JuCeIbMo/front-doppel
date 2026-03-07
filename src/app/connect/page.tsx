import { EmbeddedSignup } from "@/components/connect/EmbeddedSignup";

const steps = [
  { number: 1, label: "Autoriza" },
  { number: 2, label: "Selecciona numero" },
  { number: 3, label: "Listo" },
];

export default function ConnectPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      {/* Logo */}
      <a href="/" className="flex items-center gap-2 mb-12">
        <span className="text-xl font-bold text-text-primary">Doppel</span>
        <span className="inline-block w-2 h-2 rounded-full bg-accent" />
      </a>

      <div className="max-w-lg mx-auto text-center">
        {/* Headline */}
        <h1 className="text-3xl md:text-4xl font-bold text-text-primary">
          Conecta tu WhatsApp Business
        </h1>
        <p className="text-text-secondary mt-3">
          Sigue los pasos para conectar tu numero en minutos
        </p>

        {/* Visual Stepper */}
        <div className="flex items-center justify-center mt-10">
          {steps.map((step, i) => (
            <div key={step.number} className="flex items-center">
              {/* Step circle + label */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    i === 0
                      ? "bg-accent text-black"
                      : "border border-border text-text-secondary"
                  }`}
                >
                  {step.number}
                </div>
                <span
                  className={`text-xs ${
                    i === 0 ? "text-accent font-medium" : "text-text-secondary"
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connecting line */}
              {i < steps.length - 1 && (
                <div className="w-12 md:w-16 h-px bg-border mx-3 -mt-5" />
              )}
            </div>
          ))}
        </div>

        {/* Embedded Signup */}
        <div className="mt-12">
          <EmbeddedSignup />
        </div>
      </div>
    </div>
  );
}
