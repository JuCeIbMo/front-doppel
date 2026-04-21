import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terminos de Servicio — Doppel",
  description: "Terminos y condiciones de uso de la plataforma Doppel.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen py-24 px-6">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 mb-12 group">
          <span className="text-xl font-bold text-text-primary">Doppel</span>
          <span className="inline-block w-2 h-2 rounded-full bg-accent" />
        </Link>

        <h1 className="text-4xl font-bold text-text-primary mb-2">Terminos de Servicio</h1>
        <p className="text-text-secondary mb-12">Ultima actualizacion: 7 de marzo de 2026</p>

        <div className="prose prose-invert max-w-none space-y-10 text-text-secondary leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-text-primary mb-4">1. Descripcion del servicio</h2>
            <p>
              Doppel es una plataforma SaaS que permite a negocios conectar su numero de WhatsApp
              Business a un sistema de automatizacion con inteligencia artificial, mediante la API
              oficial de WhatsApp Cloud de Meta. Al utilizar nuestros servicios, aceptas estos
              terminos en su totalidad.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-text-primary mb-4">2. Elegibilidad</h2>
            <p>
              Para utilizar Doppel debes: (a) tener al menos 18 anos de edad, (b) tener una cuenta
              de WhatsApp Business valida, (c) cumplir con las Politicas de Uso de WhatsApp Business
              de Meta, y (d) tener capacidad legal para celebrar contratos vinculantes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-text-primary mb-4">
              3. Responsabilidades del usuario
            </h2>
            <p>Al utilizar Doppel, te comprometes a:</p>
            <ul className="list-disc list-inside mt-4 space-y-2">
              <li>
                Utilizar el servicio unicamente para fines legales y de acuerdo con las politicas
                de Meta y WhatsApp Business
              </li>
              <li>
                No enviar mensajes spam, no solicitados, o que violen las politicas de mensajeria
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
            <h2 className="text-xl font-bold text-text-primary mb-4">4. Propiedad intelectual</h2>
            <p>
              Doppel y su contenido, caracteristicas y funcionalidades son propiedad de Doppel y
              estan protegidos por leyes de propiedad intelectual. No se te concede ningun derecho
              o licencia sobre la plataforma mas alla del uso limitado necesario para acceder al
              servicio contratado.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-text-primary mb-4">
              5. Limitacion de responsabilidad
            </h2>
            <p>
              En la maxima medida permitida por la ley aplicable, Doppel no sera responsable por
              danos indirectos, incidentales, especiales, consecuentes o punitivos, incluyendo
              perdida de beneficios, datos o buena voluntad, interrupcion del servicio, o el costo
              de servicios sustitutos, que surjan de o en conexion con estos terminos o el uso
              del servicio.
            </p>
            <p className="mt-4">
              La responsabilidad total de Doppel hacia ti por cualquier reclamacion que surja de
              estos terminos o del uso del servicio no excedera el monto pagado por ti a Doppel
              en los tres (3) meses anteriores al evento que dio lugar a la reclamacion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-text-primary mb-4">6. Terminacion</h2>
            <p>
              Puedes dejar de usar el servicio en cualquier momento. Doppel puede suspender o
              terminar tu acceso al servicio si violas estos terminos, si tu cuenta presenta
              actividad sospechosa, o si es requerido por ley o por las politicas de Meta.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-text-primary mb-4">
              7. Modificaciones al servicio
            </h2>
            <p>
              Doppel se reserva el derecho de modificar o descontinuar el servicio en cualquier
              momento, con o sin aviso previo. No seremos responsables ante ti ni ante terceros
              por ninguna modificacion, suspension o discontinuacion del servicio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-text-primary mb-4">8. Ley aplicable</h2>
            <p>
              Estos terminos se rigen por las leyes de la Republica Argentina, sin dar efecto a
              ninguna disposicion sobre conflicto de leyes. Cualquier disputa que surja de o
              en relacion con estos terminos sera sometida a la jurisdiccion exclusiva de los
              tribunales competentes de la Ciudad Autonoma de Buenos Aires.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-text-primary mb-4">9. Contacto</h2>
            <p>
              Para preguntas sobre estos terminos:{" "}
              <a href="mailto:legal@doppel.lat" className="text-accent hover:underline">
                legal@doppel.lat
              </a>
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
