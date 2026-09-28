import { EmbeddedSignup } from "@/components/connect/EmbeddedSignup";

/**
 * Shown when no WhatsApp account is connected: a red plane, because nothing reaches the
 * bot until the Owner connects, with the same Meta flow used at onboarding right here.
 */
export function WhatsAppDisconnectedNotice() {
  return (
    <section className="chakana bg-waiting px-4 pb-4 pt-6 text-paper sm:px-6">
      <h2 className="text-2xl font-black leading-tight">WhatsApp no conectado</h2>
      <p className="mt-1 max-w-prose text-[15px]">
        El bot no puede responder a nadie hasta que conectes el número de tu negocio. Usa un número
        que no esté en la app de WhatsApp de tu celular.
      </p>
      <div className="mt-4">
        <EmbeddedSignup />
      </div>
    </section>
  );
}
