import { Card } from "@/components/ui/Card";
import { EmbeddedSignup } from "@/components/connect/EmbeddedSignup";

/**
 * Shown on the automation dashboard when no WhatsApp account is connected. Makes the
 * disconnected state unmistakable and offers inline reconnection via EmbeddedSignup —
 * the same Meta flow used at onboarding — so the user reconnects without leaving the
 * dashboard (and without bouncing through /connect, which redirects onboarded users).
 */
export function WhatsAppDisconnectedNotice() {
  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <span aria-hidden className="text-amber-400 text-xl leading-none">
            ⚠
          </span>
          <div>
            <h2 className="text-text-primary font-semibold text-base">
              WhatsApp no conectado
            </h2>
            <p className="text-text-secondary text-sm mt-1">
              El bot no puede responder mensajes hasta que conectes una cuenta de
              WhatsApp Business. Conéctala para reactivar la automatización.
            </p>
          </div>
        </div>
        <EmbeddedSignup />
      </div>
    </Card>
  );
}
