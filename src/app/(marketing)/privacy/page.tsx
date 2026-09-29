import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/LegalPage";

export const metadata: Metadata = {
  title: "Política de privacidad — Doppel",
  description: "Política de privacidad de Doppel. Cómo recopilamos, usamos y protegemos tu información.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de privacidad" updated="7 de marzo de 2026">
      <section>
        <h2>1. Información que recopilamos</h2>
        <p>Doppel recopila la siguiente información cuando utilizas nuestros servicios:</p>
        <ul>
          <li>
            <strong>Información de cuenta de Meta/Facebook:</strong>{" "}
            Al conectar tu WhatsApp Business, recopilamos tu identificador de cuenta de WhatsApp
            Business (WABA ID), identificador de número de teléfono, y número de teléfono de
            WhatsApp Business.
          </li>
          <li>
            <strong>Mensajes de WhatsApp:</strong>{" "}
            Procesamos los mensajes enviados y recibidos a través de tu número de WhatsApp Business
            conectado para proporcionar el servicio de automatización.
          </li>
          <li>
            <strong>Información de contacto:</strong>{" "}
            Nombre, dirección de correo electrónico y datos de contacto que nos proporcionas al
            registrarte.
          </li>
          <li>
            <strong>Datos de uso:</strong>{" "}
            Información sobre cómo utilizas nuestra plataforma, incluyendo frecuencia de uso y
            configuraciones.
          </li>
        </ul>
      </section>

      <section>
        <h2>2. Cómo usamos tu información</h2>
        <p>Utilizamos la información recopilada para:</p>
        <ul>
          <li>Proveer, mantener y mejorar nuestros servicios de automatización de WhatsApp</li>
          <li>Procesar y responder mensajes en tu nombre a través de la API de WhatsApp Cloud de Meta</li>
          <li>Enviarte notificaciones importantes sobre el servicio</li>
          <li>Proporcionar soporte técnico</li>
          <li>Cumplir con obligaciones legales aplicables</li>
        </ul>
      </section>

      <section>
        <h2>3. Compartir información con terceros</h2>
        <p>
          Doppel no vende tu información personal. Compartimos información únicamente con:
        </p>
        <ul>
          <li>
            <strong>Meta Platforms, Inc.:</strong>{" "}
            Para procesar mensajes a través de la API de WhatsApp Cloud, de acuerdo con las
            políticas de Meta.
          </li>
          <li>
            <strong>Proveedores de servicios técnicos:</strong>{" "}
            Empresas que nos ayudan a operar la plataforma (almacenamiento en nube,
            infraestructura), bajo acuerdos de confidencialidad estrictos.
          </li>
        </ul>
        <p>
          No compartimos el contenido de los mensajes de tus usuarios con terceros, excepto
          cuando sea requerido por ley.
        </p>
      </section>

      <section>
        <h2>4. Seguridad de los datos</h2>
        <p>
          Implementamos medidas de seguridad técnicas y organizativas para proteger tu
          información, incluyendo cifrado en tránsito (HTTPS/TLS) y en reposo, y controles
          de acceso estrictos.
        </p>
      </section>

      <section>
        <h2>5. Retención de datos</h2>
        <p>
          Conservamos los datos de conversaciones por un período de 90 días por defecto. Los
          datos de cuenta se conservan mientras tu cuenta esté activa. Al cancelar tu cuenta,
          tus datos son eliminados en un plazo de 30 días.
        </p>
      </section>

      <section>
        <h2>6. Tus derechos</h2>
        <p>Tienes derecho a:</p>
        <ul>
          <li>Acceder a tu información personal</li>
          <li>Corregir información inexacta</li>
          <li>Solicitar la eliminación de tus datos</li>
          <li>Desconectar tu WhatsApp Business en cualquier momento</li>
        </ul>
        <p>
          Para ejercer estos derechos, contacta:{" "}
          <a href="mailto:privacy@doppel.lat">
            privacy@doppel.lat
          </a>
        </p>
      </section>

      <section>
        <h2>
          7. Datos de usuarios finales (tus clientes)
        </h2>
        <p>
          Al utilizar Doppel, tú eres el responsable del tratamiento de los datos de tus
          propios clientes que interactúan vía WhatsApp. Doppel actúa como procesador de
          datos en tu nombre. Debes asegurarte de tener las bases legales apropiadas para
          procesar esos mensajes.
        </p>
      </section>

      <section>
        <h2>8. Cambios a esta política</h2>
        <p>
          Notificaremos cambios materiales a esta política con al menos 30 días de
          anticipación por correo electrónico.
        </p>
      </section>

      <section>
        <h2>9. Contacto</h2>
        <p>
          Para preguntas sobre privacidad:{" "}
          <a href="mailto:privacy@doppel.lat">
            privacy@doppel.lat
          </a>
        </p>
      </section>
    </LegalPage>
  );
}
