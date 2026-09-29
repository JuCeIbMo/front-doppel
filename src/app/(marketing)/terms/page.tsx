import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/LegalPage";

export const metadata: Metadata = {
  title: "Términos de servicio — Doppel",
  description: "Términos y condiciones de uso de la plataforma Doppel.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Términos de servicio" updated="7 de marzo de 2026">
      <section>
        <h2>1. Descripción del servicio</h2>
        <p>
          Doppel es una plataforma SaaS que permite a negocios conectar su número de WhatsApp
          Business a un sistema de automatización con inteligencia artificial, mediante la API
          oficial de WhatsApp Cloud de Meta. Al utilizar nuestros servicios, aceptas estos
          términos en su totalidad.
        </p>
      </section>

      <section>
        <h2>2. Elegibilidad</h2>
        <p>
          Para utilizar Doppel debes: (a) tener al menos 18 años de edad, (b) tener una cuenta
          de WhatsApp Business válida, (c) cumplir con las Políticas de Uso de WhatsApp Business
          de Meta, y (d) tener capacidad legal para celebrar contratos vinculantes.
        </p>
      </section>

      <section>
        <h2>
          3. Responsabilidades del usuario
        </h2>
        <p>Al utilizar Doppel, te comprometes a:</p>
        <ul>
          <li>
            Utilizar el servicio únicamente para fines legales y de acuerdo con las políticas
            de Meta y WhatsApp Business
          </li>
          <li>
            No enviar mensajes spam, no solicitados, o que violen las políticas de mensajería
            de WhatsApp
          </li>
          <li>
            Obtener el consentimiento apropiado de tus usuarios finales para procesar sus
            mensajes mediante nuestro servicio
          </li>
          <li>Mantener la confidencialidad de tus credenciales de acceso</li>
          <li>
            Notificarnos inmediatamente sobre cualquier uso no autorizado de tu cuenta
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Propiedad intelectual</h2>
        <p>
          Doppel y su contenido, características y funcionalidades son propiedad de Doppel y
          están protegidos por leyes de propiedad intelectual. No se te concede ningún derecho
          o licencia sobre la plataforma más allá del uso limitado necesario para acceder al
          servicio contratado.
        </p>
      </section>

      <section>
        <h2>
          5. Limitación de responsabilidad
        </h2>
        <p>
          En la máxima medida permitida por la ley aplicable, Doppel no será responsable por
          daños indirectos, incidentales, especiales, consecuentes o punitivos, incluyendo
          pérdida de beneficios, datos o buena voluntad, interrupción del servicio, o el costo
          de servicios sustitutos, que surjan de o en conexión con estos términos o el uso
          del servicio.
        </p>
        <p>
          La responsabilidad total de Doppel hacia ti por cualquier reclamación que surja de
          estos términos o del uso del servicio no excederá el monto pagado por ti a Doppel
          en los tres (3) meses anteriores al evento que dio lugar a la reclamación.
        </p>
      </section>

      <section>
        <h2>6. Terminación</h2>
        <p>
          Puedes dejar de usar el servicio en cualquier momento. Doppel puede suspender o
          terminar tu acceso al servicio si violas estos términos, si tu cuenta presenta
          actividad sospechosa, o si es requerido por ley o por las políticas de Meta.
        </p>
      </section>

      <section>
        <h2>
          7. Modificaciones al servicio
        </h2>
        <p>
          Doppel se reserva el derecho de modificar o descontinuar el servicio en cualquier
          momento, con o sin aviso previo. No seremos responsables ante ti ni ante terceros
          por ninguna modificación, suspensión o discontinuación del servicio.
        </p>
      </section>

      <section>
        <h2>8. Ley aplicable</h2>
        <p>
          Estos términos se rigen por las leyes de la República Argentina, sin dar efecto a
          ninguna disposición sobre conflicto de leyes. Cualquier disputa que surja de o
          en relación con estos términos será sometida a la jurisdicción exclusiva de los
          tribunales competentes de la Ciudad Autónoma de Buenos Aires.
        </p>
      </section>

      <section>
        <h2>9. Contacto</h2>
        <p>
          Para preguntas sobre estos términos:{" "}
          <a href="mailto:legal@doppel.lat">
            legal@doppel.lat
          </a>
        </p>
      </section>
    </LegalPage>
  );
}
