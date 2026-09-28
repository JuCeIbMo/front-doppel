# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Owner (principal):** dueño de una PyME boliviana (tienda, restaurante, salón, servicios) que vende y atiende por WhatsApp. No es técnico. Usa el panel sobre todo desde el celular y a veces desde la compu.
- **Superadmin (soporte):** el equipo de Doppel, que entra desde `/admin` para terminar de configurar negocios y dar soporte. En la bitácora sus acciones aparecen como "Soporte (Julio)".
- En v1 no hay roles de empleados. El cajero (`/cashier`) no entra en el alcance de v1.

## Product Purpose

Doppel atiende el WhatsApp de un negocio chico: un asistente de IA responde a los clientes, vende con el catálogo real y agenda citas, y cada pedido, venta o cita queda registrado en un ERP ligero. El panel web sirve para **ver, supervisar y configurar**. La operación del día a día (aprobar, cobrar, entregar) va sobre todo por WhatsApp con el Admin Agent, aunque la web también la permite.

Éxito: el Owner deja de contestar WhatsApp a mano, conserva el control de lo importante y puede ver en cualquier momento qué hizo el bot.

## Positioning

- **Bot y ERP en uno:** el bot vende y agenda con el catálogo, el inventario, los servicios y los horarios reales del negocio, y lo que cierra queda registrado directo en el ERP. No es un chatbot pegado a una planilla.
- **La IA se encarga de todo y el Owner aprueba:** el bot lleva la conversación de principio a fin y solo consulta al Owner (Aprobaciones) antes de las decisiones sensibles.
- **Vender y agendar pesan lo mismo:** cada negocio activa `selling_enabled`, `booking_enabled` o ambos, y el panel muestra solo lo que corresponde.
- **Listo en minutos:** el Owner se registra solo con OTP por email y conecta WhatsApp con el Embedded Signup de Meta, sin código.

## Operating Context

- Alta autoservicio: login OTP, nombre del negocio, elegir vender, agendar o ambos, y después Embedded Signup (Meta exige su propio login). El Owner recorre estas pantallas solo, así que tienen que estar pulidas.
- El superadmin configura el resto (productos, servicios, equipo, horarios, lo que sabe el bot, teléfonos del encargado) desde `/admin` → "Entrar", que abre el mismo panel del Owner con una barra "Estás viendo: X · Salir". `/admin` muestra primero los negocios con el onboarding incompleto.
- El Owner nunca queda bloqueado: las pantallas de configuración también están disponibles para él y, mientras falten pasos, Inicio muestra el checklist.
- Navegación mobile-first. Barra inferior: Inicio · Conversaciones · Pedidos/Agenda · Aprobaciones · Más. Menú lateral en la compu.
- Inicio: checklist (mientras falten pasos), resumen de hoy, "necesita tu atención", uso del mes y las citas de hoy si el negocio agenda.
- Agenda: lista por día en el celular, grilla por horas en la compu.
- Conversaciones: bandeja con los mensajes del bot como burbujas estilo WhatsApp (imagen, botones, lista, productos). Cada contacto tiene una etapa (Nuevo / Por cerrar / Cliente) que se calcula sola por eventos y que el Owner puede mover a mano.
- Los datos se actualizan por polling. No hay notificaciones push ni chat web con el Admin Agent.

## Capabilities and Constraints

- Stack actual: Next.js App Router, Tailwind v4, supabase-js (OTP), React Query, tipos generados del OpenAPI de la API, Playwright + Vitest. Deploy en Dokploy.
- Solo español. La moneda y la zona horaria salen del Business (hoy BOB / `es-BO`).
- Las pantallas que todavía no tienen backend muestran "Próximamente" y se activan en `src/lib/features.ts`.
- Cada pantalla necesita estados de carga, vacío y error. Cada `code` de una respuesta `rejected` necesita su texto en español.
- Tiene que funcionar bien a 360 px.
- Cambios de backend pendientes (v1): modo superadmin (`X-Business-Id` + actor "Soporte"), prioridad del nombre del contacto (Owner > cita > perfil de WhatsApp, `rename_contact`), no leídos como conversaciones derivadas que el Owner no abrió (`last_read_at`), etapa del contacto automática o manual, y mensajes estructurados del bot.
- Fuera de v1: filtros y búsqueda en el servidor, historial para gráficos, la columna de cliente en la lista de ventas.
- Decisión abierta: si el Owner cambia a mano la etapa de un contacto, ¿se mantiene hasta el próximo evento? ¿Existe "Perdido" como etapa que solo se pone a mano?

## Brand Commitments

- Nombre: Doppel. El producto actual es oscuro, con el verde de WhatsApp (`#25D366`) como acento. Cuánto de eso sobrevive al rediseño se decide en la fase visual, no acá.
- Voz: español directo y simple para un dueño no técnico. Decisión abierta: el copy actual mezcla español neutro con voseo ("Visualizá") y falta definir entre tú, vos o neutro.

## Evidence on Hand

- No hay clientes, testimonios, métricas ni casos publicables. Ninguna pantalla puede inventarlos.
- Existe la demo pública `/demo`, con datos de ejemplo.
- Páginas legales: `/privacy`, `/terms`, `/data-deletion` (las exige Meta).

## Product Principles

1. **Supervisar, no operar:** la web muestra lo que hizo el bot y lo que necesita al Owner, y la operación diaria va por WhatsApp. Cada pantalla responde "¿está todo bien y qué tengo que decidir?".
2. **El Owner conserva el control:** la IA actúa sola, pero las decisiones sensibles pasan por aprobación y cada acción del bot se puede rastrear en la bitácora.
3. **Solo lo que aplica a este negocio:** vender y agendar son módulos que se activan por separado. No aparece nada que no corresponda.
4. **Celular primero, para alguien no técnico:** 360 px, uso con una mano, sin jerga y con los errores explicados en español.
5. **Nunca un callejón sin salida:** el onboarding no bloquea al Owner y cada pantalla tiene estados claros de carga, vacío y error.
