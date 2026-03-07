import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politica de Privacidad — Doppel",
  description: "Politica de privacidad de Doppel. Como recopilamos, usamos y protegemos tu informacion.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen py-24 px-6">
      <div className="max-w-3xl mx-auto">
        <a href="/" className="inline-flex items-center gap-2 mb-12 group">
          <span className="text-xl font-bold text-text-primary">Doppel</span>
          <span className="inline-block w-2 h-2 rounded-full bg-accent" />
        </a>

        <h1 className="text-4xl font-bold text-text-primary mb-2">Politica de Privacidad</h1>
        <p className="text-text-secondary mb-12">Ultima actualizacion: 7 de marzo de 2026</p>

        <div className="prose prose-invert max-w-none space-y-10 text-text-secondary leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-text-primary mb-4">1. Informacion que recopilamos</h2>
            <p>Doppel recopila la siguiente informacion cuando utilizas nuestros servicios:</p>
            <ul className="list-disc list-inside mt-4 space-y-2">
              <li>
                <strong className="text-text-primary">Informacion de cuenta de Meta/Facebook:</strong>{" "}
                Al conectar tu WhatsApp Business, recopilamos tu identificador de cuenta de WhatsApp
                Business (WABA ID), identificador de numero de telefono, y numero de telefono de
                WhatsApp Business.
              </li>
              <li>
                <strong className="text-text-primary">Mensajes de WhatsApp:</strong>{" "}
                Procesamos los mensajes enviados y recibidos a traves de tu numero de WhatsApp Business
                conectado para proporcionar el servicio de automatizacion.
              </li>
              <li>
                <strong className="text-text-primary">Informacion de contacto:</strong>{" "}
                Nombre, direccion de correo electronico y datos de contacto que nos proporcionas al
                registrarte.
              </li>
              <li>
                <strong className="text-text-primary">Datos de uso:</strong>{" "}
                Informacion sobre como utilizas nuestra plataforma, incluyendo frecuencia de uso y
                configuraciones.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-text-primary mb-4">2. Como usamos tu informacion</h2>
            <p>Utilizamos la informacion recopilada para:</p>
            <ul className="list-disc list-inside mt-4 space-y-2">
              <li>Proveer, mantener y mejorar nuestros servicios de automatizacion de WhatsApp</li>
              <li>Procesar y responder mensajes en tu nombre a traves de la API de WhatsApp Cloud de Meta</li>
              <li>Enviarte notificaciones importantes sobre el servicio</li>
              <li>Proporcionar soporte tecnico</li>
              <li>Cumplir con obligaciones legales aplicables</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-text-primary mb-4">3. Compartir informacion con terceros</h2>
            <p>
              Doppel no vende tu informacion personal. Compartimos informacion unicamente con:
            </p>
            <ul className="list-disc list-inside mt-4 space-y-2">
              <li>
                <strong className="text-text-primary">Meta Platforms, Inc.:</strong>{" "}
                Para procesar mensajes a traves de la API de WhatsApp Cloud, de acuerdo con las
                politicas de Meta.
              </li>
              <li>
                <strong className="text-text-primary">Proveedores de servicios tecnicos:</strong>{" "}
                Empresas que nos ayudan a operar la plataforma (almacenamiento en nube,
                infraestructura), bajo acuerdos de confidencialidad estrictos.
              </li>
            </ul>
            <p className="mt-4">
              No compartimos el contenido de los mensajes de tus usuarios con terceros, excepto
              cuando sea requerido por ley.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-text-primary mb-4">4. Seguridad de los datos</h2>
            <p>
              Implementamos medidas de seguridad tecnicas y organizativas para proteger tu
              informacion, incluyendo cifrado en transito (HTTPS/TLS) y en reposo, y controles
              de acceso estrictos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-text-primary mb-4">5. Retencion de datos</h2>
            <p>
              Conservamos los datos de conversaciones por un periodo de 90 dias por defecto. Los
              datos de cuenta se conservan mientras tu cuenta este activa. Al cancelar tu cuenta,
              tus datos son eliminados en un plazo de 30 dias.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-text-primary mb-4">6. Tus derechos</h2>
            <p>Tienes derecho a:</p>
            <ul className="list-disc list-inside mt-4 space-y-2">
              <li>Acceder a tu informacion personal</li>
              <li>Corregir informacion inexacta</li>
              <li>Solicitar la eliminacion de tus datos</li>
              <li>Desconectar tu WhatsApp Business en cualquier momento</li>
            </ul>
            <p className="mt-4">
              Para ejercer estos derechos, contacta:{" "}
              <a href="mailto:privacy@doppel.lat" className="text-accent hover:underline">
                privacy@doppel.lat
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-text-primary mb-4">
              7. Datos de usuarios finales (tus clientes)
            </h2>
            <p>
              Al utilizar Doppel, tu eres el responsable del tratamiento de los datos de tus
              propios clientes que interactuan via WhatsApp. Doppel actua como procesador de
              datos en tu nombre. Debes asegurarte de tener las bases legales apropiadas para
              procesar esos mensajes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-text-primary mb-4">8. Cambios a esta politica</h2>
            <p>
              Notificaremos cambios materiales a esta politica con al menos 30 dias de
              anticipacion por correo electronico.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-text-primary mb-4">9. Contacto</h2>
            <p>
              Para preguntas sobre privacidad:{" "}
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
