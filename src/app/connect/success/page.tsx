import Link from "next/link";
import { ConnectShell, StepTitle, primaryClass } from "@/components/connect/ConnectShell";

type SuccessPageProps = {
  searchParams: Promise<{
    phone?: string;
    business?: string;
  }>;
};

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const { phone, business } = await searchParams;

  return (
    <ConnectShell stage={4} says="¡Listo! Ya estoy atendiendo tu WhatsApp.">
      <div className="flex flex-col gap-4">
        <StepTitle>Tu empleado ya está trabajando</StepTitle>
        <p className="text-sm">
          {business ? `Negocio: ${business}. ` : ""}
          {phone ? `Atiende el ${phone}. ` : ""}
          Termina de enseñarle tus productos, horarios y lo que debe saber desde tu panel.
        </p>
        <Link href="/dashboard" className={primaryClass}>
          Ir a mi panel →
        </Link>
        <Link href="/" className="text-center text-sm font-bold underline underline-offset-4">
          Volver al inicio
        </Link>
      </div>
    </ConnectShell>
  );
}
