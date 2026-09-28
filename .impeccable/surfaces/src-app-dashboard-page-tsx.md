---
version: 1
slug: "src-app-dashboard-page-tsx"
primary_target: "src/app/dashboard/page.tsx"
related_targets: ["src/components/dashboard/OverviewView.tsx"]
---

# Inicio (`/dashboard`)

Modo: Operate. El Owner, en el celular y a pleno día dentro de su negocio, abre Inicio para saber en 3 segundos si algo lo espera.

- Primero lo que te espera: aprobaciones, clientes que te pasó el bot, pedidos por cobrar/entregar (si vende).
- Luego: pasos de alta (mientras falten), Hoy (vendido, el bot, citas si agenda, últimas ventas), Mes (mensajes y minutos).
- Datos que la API aún no da ("chats atendidos por el bot hoy"): mock solo en desarrollo; en producción, "Pronto". Pedir al backend.
- Aprobado por el usuario sobre `.impeccable/mocks/inicio-final.html` (ronda de mocks HTML, sin comps generados).

## Direction contract

THESIS: Inicio es la página de hoy del cuaderno de ventas del negocio, con un cartel de color cholet que grita lo que te espera. Rechaza la grilla de tarjetas de métricas iguales sobre fondo oscuro.

OWN-WORLD: hoja de papel crema #FBF7F2 con cuadrícula fina y margen rojo; tinta #231A16; colores del aguayo con un solo rol cada uno: rojo #C8102E te espera, verde #0E7C4A todo en orden / el bot, amarillo #F2A900 dinero, azul #2B2D84 pasos, rosa #D0356B el mes (no #E5437A: con texto blanco de 13 px daba 3,9:1; #D0356B da 4,75:1). Tinta secundaria #75655B, por contraste sobre el papel. El rojo es solo "te espera": el shell marca dónde estás en tinta, nunca en rojo. Planos llenos con esquinas escalonadas tipo chakana; separadores verticales de color en el margen; montos y fecha escritos a mano (Kalam); titulares Archivo condensado pesado; texto Figtree.

STORY: el Owner entiende de un vistazo si hay algo que decidir, toca el renglón y va directo; si no, ve que el bot se encarga y revisa cómo va el día.

FIRST VIEWPORT: fecha manuscrita arriba con el nombre del negocio; debajo, a todo el ancho y sobre el margen, el cartel rojo con la cifra grande y un renglón tocable por pendiente (verde con check si no hay nada); en negocio nuevo, pasos numerados en el margen; luego empieza «Hoy» con sus dos fichas.

FORM: fusión de Cuaderno (#1 de la lista) y Fachada cholet (#6, asignada) en color Aguayo, elegida por el usuario en mocks HTML. Seed 0683a07f.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
