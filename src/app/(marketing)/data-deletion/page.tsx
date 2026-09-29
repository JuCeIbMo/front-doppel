import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/LegalPage";

export const metadata: Metadata = {
  title: "Eliminación de datos — Doppel",
  description: "Cómo solicitar la eliminación de tus datos en Doppel.",
};

export default function DataDeletionPage() {
  return (
    <LegalPage title="Eliminación de datos" updated="26 de marzo de 2026">
      <section>
        <h2>1. ¿Qué datos almacena Doppel?</h2>
        <p>Cuando utilizas Doppel, almacenamos la siguiente información asociada a tu cuenta:</p>
        <ul>
          <li>
            <strong>Datos de cuenta Meta / WhatsApp Business:</strong>{" "}
            Identificador de cuenta de WhatsApp Business (WABA ID), identificador y número de teléfono
            de WhatsApp Business.
          </li>
          <li>
            <strong>Mensajes procesados:</strong>{" "}
            Historial de conversaciones gestionadas a través de tu número de WhatsApp Business conectado.
          </li>
          <li>
            <strong>Información de contacto:</strong>{" "}
            Nombre, dirección de correo electrónico y datos proporcionados al registrarte.
          </li>
          <li>
            <strong>Configuraciones de la plataforma:</strong>{" "}
            Preferencias, flujos de automatización y ajustes de tu cuenta.
          </li>
        </ul>
      </section>

      <section>
        <h2>2. Cómo solicitar la eliminación de tus datos</h2>
        <p>Para solicitar la eliminación de todos tus datos, sigue estos pasos:</p>
        <ol>
          <li>
            Envía un correo electrónico a{" "}
            <a href="mailto:privacy@doppel.lat">
              privacy@doppel.lat
            </a>
          </li>
          <li>
            Usa el asunto: <strong>Solicitud de Eliminación de Datos</strong>
          </li>
          <li>
            Incluye en el cuerpo del mensaje: tu nombre completo y el correo electrónico asociado
            a tu cuenta de Doppel.
          </li>
        </ol>
        <p>
          Si ya tienes acceso al dashboard, también puedes eliminar tu cuenta desde la
          plataforma. Esa acción elimina tu tenant, configuraciones y mensajes almacenados
          en Doppel.
        </p>
      </section>

      <section>
        <h2>3. Qué se elimina</h2>
        <p>Al confirmar tu solicitud, Doppel elimina permanentemente:</p>
        <ul>
          <li>Tu perfil de cuenta y datos de acceso</li>
          <li>Los identificadores de tu cuenta de WhatsApp Business vinculada</li>
          <li>El historial completo de conversaciones procesadas</li>
          <li>Todas las configuraciones y flujos de automatización</li>
        </ul>
        <p>
          Los datos eliminados no pueden recuperarse una vez completado el proceso.
        </p>
      </section>

      <section>
        <h2>4. Plazos</h2>
        <p>
          Una vez recibida tu solicitud, te enviaremos una confirmación en un plazo de{" "}
          <strong>5 días hábiles</strong>. La eliminación
          completa de tus datos se llevará a cabo dentro de los{" "}
          <strong>30 días</strong> siguientes a la confirmación.
        </p>
      </section>

      <section>
        <h2>5. Contacto</h2>
        <p>
          Para cualquier consulta sobre la eliminación de datos o tus derechos de privacidad,
          contacta:{" "}
          <a href="mailto:privacy@doppel.lat">
            privacy@doppel.lat
          </a>
        </p>
      </section>
    </LegalPage>
  );
}
