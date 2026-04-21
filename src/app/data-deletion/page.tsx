import type { Metadata } from "next";
import Link from "next/link";
 
export const metadata: Metadata = {
  title: "Eliminación de Datos — Doppel",
  description: "Cómo solicitar la eliminación de tus datos en Doppel.",
};
 
export default function DataDeletionPage() {
  return (
    <div className="min-h-screen py-24 px-6">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 mb-12 group">
          <span className="text-xl font-bold text-text-primary">Doppel</span>
          <span className="inline-block w-2 h-2 rounded-full bg-accent" />
        </Link>
 
        <h1 className="text-4xl font-bold text-text-primary mb-2">Eliminación de Datos</h1>
        <p className="text-text-secondary mb-12">Ultima actualización: 26 de marzo de 2026</p>
 
        <div className="prose prose-invert max-w-none space-y-10 text-text-secondary leading-relaxed">
 
          <section>
            <h2 className="text-xl font-bold text-text-primary mb-4">1. ¿Qué datos almacena Doppel?</h2>
            <p>Cuando utilizas Doppel, almacenamos la siguiente información asociada a tu cuenta:</p>
            <ul className="list-disc list-inside mt-4 space-y-2">
              <li>
                <strong className="text-text-primary">Datos de cuenta Meta / WhatsApp Business:</strong>{" "}
                Identificador de cuenta de WhatsApp Business (WABA ID), identificador y número de teléfono
                de WhatsApp Business.
              </li>
              <li>
                <strong className="text-text-primary">Mensajes procesados:</strong>{" "}
                Historial de conversaciones gestionadas a través de tu número de WhatsApp Business conectado.
              </li>
              <li>
                <strong className="text-text-primary">Información de contacto:</strong>{" "}
                Nombre, dirección de correo electrónico y datos proporcionados al registrarte.
              </li>
              <li>
                <strong className="text-text-primary">Configuraciones de la plataforma:</strong>{" "}
                Preferencias, flujos de automatización y ajustes de tu cuenta.
              </li>
            </ul>
          </section>
 
          <section>
            <h2 className="text-xl font-bold text-text-primary mb-4">2. Cómo solicitar la eliminación de tus datos</h2>
            <p>Para solicitar la eliminación de todos tus datos, sigue estos pasos:</p>
            <ol className="list-decimal list-inside mt-4 space-y-3">
              <li>
                Envía un correo electrónico a{" "}
                <a href="mailto:privacy@doppel.lat" className="text-accent hover:underline">
                  privacy@doppel.lat
                </a>
              </li>
              <li>
                Usa el asunto: <strong className="text-text-primary">Solicitud de Eliminación de Datos</strong>
              </li>
              <li>
                Incluye en el cuerpo del mensaje: tu nombre completo y el correo electrónico asociado
                a tu cuenta de Doppel.
              </li>
            </ol>
            <p className="mt-4">
              Si ya tienes acceso al dashboard, también puedes eliminar tu cuenta desde la
              plataforma. Esa acción elimina tu tenant, configuraciones y mensajes almacenados
              en Doppel.
            </p>
          </section>
 
          <section>
            <h2 className="text-xl font-bold text-text-primary mb-4">3. Qué se elimina</h2>
            <p>Al confirmar tu solicitud, Doppel elimina permanentemente:</p>
            <ul className="list-disc list-inside mt-4 space-y-2">
              <li>Tu perfil de cuenta y datos de acceso</li>
              <li>Los identificadores de tu cuenta de WhatsApp Business vinculada</li>
              <li>El historial completo de conversaciones procesadas</li>
              <li>Todas las configuraciones y flujos de automatización</li>
            </ul>
            <p className="mt-4">
              Los datos eliminados no pueden recuperarse una vez completado el proceso.
            </p>
          </section>
 
          <section>
            <h2 className="text-xl font-bold text-text-primary mb-4">4. Plazos</h2>
            <p>
              Una vez recibida tu solicitud, te enviaremos una confirmación en un plazo de{" "}
              <strong className="text-text-primary">5 días hábiles</strong>. La eliminación
              completa de tus datos se llevará a cabo dentro de los{" "}
              <strong className="text-text-primary">30 días</strong> siguientes a la confirmación.
            </p>
          </section>
 
          <section>
            <h2 className="text-xl font-bold text-text-primary mb-4">5. Contacto</h2>
            <p>
              Para cualquier consulta sobre la eliminación de datos o tus derechos de privacidad,
              contacta:{" "}
              <a href="mailto:privacy@doppel.lat" className="text-accent hover:underline">
                privacy@doppel.lat
              </a>
            </p>
          </section>
 
        </div>
      </div>
    </div>
  );
}
