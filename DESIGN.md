---
name: Doppel
description: El panel del Owner como la página de hoy de un cuaderno de ventas, con planos de color aguayo sobre papel cuadriculado.
colors:
  paper: "#FBF7F2"
  paper-grid: "#EBDFD3"
  paper-rule: "#DCCAB8"
  paper-shade: "#F1E8DE"
  ink: "#231A16"
  ink-muted: "#75655B"
  waiting: "#C8102E"
  settled: "#0E7C4A"
  money: "#F2A900"
  steps: "#2B2D84"
  month: "#D0356B"
typography:
  display-count:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "58px"
    fontWeight: 900
    lineHeight: 0.85
    fontVariation: "'wdth' 72"
  headline:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 900
    lineHeight: 1
    fontVariation: "'wdth' 78"
  title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 800
    lineHeight: 1.25
    fontVariation: "'wdth' 85"
  label:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 800
    letterSpacing: "0.14em"
  margin-tab:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 900
    letterSpacing: "0.14em"
    fontVariation: "'wdth' 85"
  hand-figure:
    fontFamily: "Kalam, cursive"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1
  hand-date:
    fontFamily: "Kalam, cursive"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.25
  hand-amount:
    fontFamily: "Kalam, cursive"
    fontSize: "19px"
    fontWeight: 700
  body:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  body-small:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
rounded:
  none: "0px"
spacing:
  chakana-step: "10px"
  grid: "20px"
  plane-x: "16px"
  plane-top: "24px"
  section: "32px"
  row: "42px"
  margin-line: "46px"
  margin: "58px"
components:
  plane-waiting:
    backgroundColor: "{colors.waiting}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    padding: "24px 16px 8px"
  plane-settled:
    backgroundColor: "{colors.settled}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    padding: "24px 16px 8px"
  figure-money:
    backgroundColor: "{colors.money}"
    textColor: "{colors.ink}"
    typography: "{typography.hand-figure}"
    rounded: "{rounded.none}"
    padding: "16px 12px 12px"
  figure-bot:
    backgroundColor: "{colors.settled}"
    textColor: "{colors.paper}"
    typography: "{typography.hand-figure}"
    rounded: "{rounded.none}"
    padding: "16px 12px 12px"
  margin-tab-hoy:
    backgroundColor: "{colors.money}"
    textColor: "{colors.ink}"
    typography: "{typography.margin-tab}"
    width: "36px"
  margin-tab-mes:
    backgroundColor: "{colors.month}"
    textColor: "{colors.paper}"
    typography: "{typography.margin-tab}"
    width: "36px"
  step-current:
    backgroundColor: "{colors.steps}"
    textColor: "{colors.paper}"
    typography: "{typography.body}"
    height: "42px"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.steps}"
    textColor: "{colors.paper}"
  tag-next:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    padding: "2px 8px"
  nav-item-active:
    backgroundColor: "rgba(35, 26, 22, 0.07)"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "10px 16px"
---

# Design System: Doppel

## Overview

**Creative North Star: "La página de hoy del cuaderno"**

El panel del Owner es una hoja de cuaderno de ventas: papel crema con cuadrícula fina, un margen rojo trazado a la izquierda y, pegados encima, planos de color llenos con las esquinas superiores escalonadas de una fachada cholet. Los colores vienen del aguayo y cada uno tiene un solo rol, así que el color se lee antes que el texto: rojo es lo que te espera, verde es que todo está en orden, amarillo es plata. Lo escrito a mano (fecha, montos, advertencias) convive con titulares condensados y pesados, como un cuaderno llevado por alguien que vende todos los días.

La densidad es la de una página, no la de un tablero: un cartel a todo el ancho que dice si hay algo que decidir, luego secciones marcadas en el margen, luego renglones. Nada flota; todo está pegado, trazado o escrito sobre el papel. El papel crema es una decisión confirmada por el usuario: el blanco puro abrumaba, y la hoja crema con cuadrícula de 20 px es la página del cuaderno.

Rechazo confirmado: la grilla de tarjetas de métricas iguales sobre fondo oscuro. El aspecto oscuro anterior con acento verde WhatsApp (#25D366) ya no vive en ninguna pantalla del panel: todo el panel del Owner lleva `.theme-paper`, y las primitivas compartidas (Button, Card, Input, Badge, Table) tienen su versión cuaderno con la variante `paper:`. Solo el sitio público y el flujo de conexión conservan el look anterior.

**Key Characteristics:**
- Papel crema con cuadrícula de 20 px y un margen rojo vertical.
- Un color = un rol; el color se lee antes que la palabra.
- Planos de color llenos con esquinas chakana, pegados a todo el ancho y sobre el margen.
- El margen lleva los números, los checks y las pestañas de sección.
- Tres voces tipográficas: Archivo condensado pesado para cifras y titulares, Kalam a mano para fechas, montos y advertencias, Figtree para el texto.
- Sin esquinas redondeadas, sin sombras; lo activo o presionado se marca en tinta.

## Colors

Tinta cálida sobre papel crema, con cinco colores de aguayo saturados, cada uno atado a un único significado.

### Primary
- **Rojo Te Espera** (waiting): el cartel de lo pendiente, el margen del cuaderno, la barra de uso cuando ya se pasó del límite y las advertencias y errores escritos. Siempre significa "esto necesita tu atención". Nunca navegación, nunca estado activo, nunca decoración.

### Secondary
- **Verde En Orden** (settled): el cartel de "todo en orden", la ficha de lo que hizo el bot y el check de un paso terminado. Significa "ya está resuelto, o lo resolvió el bot".
- **Amarillo Plata** (money): lo que es dinero o se cobra: la ficha de lo vendido hoy, la pestaña de la sección Hoy, el relleno de las barras de uso mensual y la selección de texto.

### Tertiary
- **Azul Bolígrafo** (steps): los pasos para empezar (el titular "N de M pasos listos", el renglón del paso actual, su número en el margen) y la tinta de bolígrafo: la fecha manuscrita, los montos y cifras escritos a mano en los renglones y los enlaces de texto ("Ver la agenda"). Es también el hover del botón en tinta.
- **Rosa Del Mes** (month): el uso del mes, solo en la pestaña de la sección Mes. Se eligió en lugar de #E5437A porque con texto blanco de 13 px aquel daba 3,9:1; este da 4,75:1.

### Neutral
- **Papel Crema** (paper): el fondo de toda pantalla redibujada y el texto sobre planos de color oscuros.
- **Cuadrícula** (paper-grid): las líneas de 1 px de la cuadrícula de 20 px. Solo fondo, nunca contenido.
- **Renglón** (paper-rule): la línea bajo cada renglón, los bordes del shell y los esqueletos de carga.
- **Papel Sombreado** (paper-shade): el lavado de hover en la navegación del shell.
- **Tinta** (ink): todo el texto, el contorno de las barras de uso, el botón, la etiqueta "Próxima", el foco y lo activo.
- **Tinta Gastada** (ink-muted): texto secundario, horas, subtítulos, renglones pasados. Se oscureció hasta este valor por contraste sobre el papel.

### Named Rules
**The Un Color, Un Rol Rule.** Cada color del aguayo significa una sola cosa en todo el panel. Si un color nuevo no tiene un significado nuevo, no entra; si un significado ya tiene color, se usa ese.

**The Rojo No Navega Rule.** El rojo es "te espera" y nada más. El shell marca dónde estás en tinta, nunca en rojo ni en verde.

## Typography

**Display Font:** Archivo, con eje de ancho `wdth` (con system-ui de respaldo)
**Body Font:** Figtree (con system-ui de respaldo)
**Hand Font:** Kalam 400/700 (con cursive de respaldo)

**Character:** Archivo condensado y muy pesado grita las cifras como un cartel pintado; Kalam es lo que el Owner anotaría con bolígrafo; Figtree queda neutra y legible entre ambos.

### Hierarchy
- **Display count** (900, 58 px, 0.85, ancho 72%): la cifra grande del cartel de lo que te espera.
- **Headline** (900, 28 px, 1, ancho 78%): el titular de los pasos para empezar.
- **Title** (800, 20 px, ancho 85%): el enunciado del cartel ("cosas te esperan", "Todo en orden") y los titulares de error.
- **Label** (800, 11 a 12 px, tracking 0.1 a 0.14em, mayúsculas): el nombre de una ficha y el encabezado de un bloque de renglones ("Citas de hoy"). Nombra lo que sigue; nunca va sobre un titular.
- **Margin tab** (900, 13 px, tracking 0.14em, mayúsculas, vertical, ancho 85%): la pestaña de sección en el margen.
- **Hand figure** (Kalam 700, 28 px, 1; 22 px bajo 360 px de ancho): el valor de una ficha.
- **Hand date / amount** (Kalam 700, 22 px / 19 px): la fecha que encabeza la página; montos y conteos en los renglones, en azul bolígrafo.
- **Hand warning** (Kalam 700, 15 px): advertencias bajo una barra de uso, en rojo.
- **Body** (Figtree 400, 15 px): renglones y enlaces. **Body small** (12 px): horas y subtítulos en tinta gastada.

### Named Rules
**The Tres Manos Rule.** Archivo es lo impreso (cifras que cuentan, titulares), Kalam es lo anotado (fechas, montos, advertencias), Figtree es el texto. Un monto nunca va en Archivo; un titular nunca va en Kalam.

**The Monto Entero Rule.** Un monto puede cortar después de "Bs", nunca dentro de la cifra.

## Layout

Una columna de página de hasta 46 rem. A la izquierda, un margen de 58 px con la línea roja de 2 px a 46 px del borde; el contenido empieza después. El margen no es espacio vacío: lleva los números y checks de los pasos, y las pestañas de sección (36 px de ancho, a todo el alto de la sección) cuando una sección necesita orientación. Las secciones que se explican solas no llevan pestaña.

El cartel de lo que te espera se pega a todo el ancho y sobre el margen (se corre 44 px a la izquierda, tapando la línea roja): es la tapa del día. Las fichas de Hoy van de a dos con 8 px entre ellas. Los renglones miden al menos 42 px y se separan con una línea de renglón. Las secciones se separan 32 px. En escritorio, los bloques de renglones de Hoy (citas y ventas) se ponen lado a lado con 32 px de separación; en móvil se apilan. La cuadrícula de 20 px es solo fondo; el contenido no se alinea a ella.

La barra inferior del móvil lleva cinco lugares con nombre corto y visible (Inicio, Chats, Pedidos o Agenda, Aprobar, Más), separada del papel por una línea de tinta de 2 px.

**The Margen Trabaja Rule.** Lo que va en el margen es numeración, estado o pestaña de sección; nunca contenido ni acciones.

## Elevation & Depth

Plano por completo. No hay sombras de elevación: la profundidad es de papel pegado sobre papel. Un plano de color se distingue de la hoja por su color lleno y su silueta chakana, no por una sombra. La barra inferior del móvil marca lo activo con una raya superior de tinta de 3 px (hecha con un inset, pero es una línea, no profundidad).

**The Pegado, No Flotante Rule.** Nada flota sobre la página. Si un elemento parece necesitar sombra, necesita un color de plano o una línea de tinta.

## Shapes

Esquinas rectas en todo (0 px). La única forma propia es la chakana: las dos esquinas superiores de cada plano de color se recortan en un escalón de 10 px, como el remate de una fachada cholet; las esquinas inferiores quedan rectas. Líneas de 1 px para renglones, 1,5 px para el contorno de las barras de uso, 2 px para el margen rojo, los separadores dentro de un plano (blanco al 30%) y el borde de los números del margen.

**The Chakana Rule.** Todo plano de color lleno (cartel, ficha, esqueleto de plano) lleva el escalón chakana arriba. Las pestañas del margen, los renglones, los botones y las etiquetas no.

## Components

### Buttons
Tinta sobre papel, sin adornos.
- **Shape:** esquinas rectas (0 px).
- **Primary:** fondo tinta, texto papel, Figtree 700 14 px, 8 px × 16 px.
- **Hover / Focus:** el fondo pasa a azul bolígrafo; el foco es un contorno de tinta de 2 px separado 2 px.
- **Text link:** Figtree 800 14 px en azul bolígrafo con una flecha, sin subrayado.

### Chips
- **Etiqueta "Próxima":** fondo tinta, texto papel, 11 px 800 en mayúsculas, 2 px × 8 px, esquinas rectas. Marca la próxima cita.

### Cards / Containers
Los contenedores son planos pegados, no tarjetas.
- **Cartel del día:** a todo el ancho y sobre el margen, rojo si algo te espera (cifra grande, enunciado y un renglón tocable por pendiente con su conteo y una flecha), verde con un check grande si no hay nada. Los renglones del cartel se separan con una línea blanca al 30% de 2 px; su hover es un lavado blanco al 10%.
- **Ficha:** un plano chakana con su nombre en label, su valor escrito a mano y una nota corta en 12 px 700. El color es el rol: amarillo para lo vendido, verde para el bot.
- **Corner Style:** chakana arriba, recto abajo.
- **Shadow Strategy:** ninguna (ver Elevation & Depth).
- **Internal Padding:** 24 px arriba y 16 px a los lados en el cartel; 16 px arriba y 12 px a los lados en la ficha.

### Navigation
- **Escritorio:** lista lateral en Figtree 14 px con ícono de 16 px; en reposo tinta gastada, hover con lavado de papel sombreado, activa con lavado de tinta al 7% y texto en tinta seminegrita. Sin raya de color, sin esquinas redondeadas.
- **Móvil:** barra inferior con ícono de 20 px y nombre de 11 px debajo; activa en tinta, negrita, con trazo de ícono más grueso y la raya superior de 3 px.

### Renglón
La unidad de toda lista: al menos 42 px de alto, Figtree 15 px, línea de renglón debajo, hora en 12 px a la izquierda y monto a mano a la derecha. Lo pasado va en tinta gastada; lo siguiente en 800 con la etiqueta "Próxima".

### Pasos para empezar
Un titular en azul ("N de M pasos listos") y una lista de renglones con el número del paso en el margen, en un cuadrado de 24 px con borde de 2 px. Paso hecho: cuadrado verde con check y texto tachado en tinta gastada. Paso actual: el renglón entero en azul con texto blanco y su número adelantado hacia el renglón. Pasos por venir: número en tinta.

### Barra de uso
Una barra de 12 px con contorno de tinta de 1,5 px sobre papel, llena de amarillo; pasa a rojo al llegar al límite. El conteo va a mano en azul arriba a la derecha; la advertencia, a mano en rojo, debajo, solo desde el 80%.

### Pestaña de margen
Una franja de 36 px de ancho y a todo el alto de su sección, en el margen, con el nombre de la sección en vertical. Su color es el rol de la sección: amarillo para Hoy, rosa para Mes.

### Movimiento
Todo con la misma curva, cubic-bezier(0.16, 1, 0.3, 1): arranca rápido y se asienta despacio, como el papel.
- **Pasar la hoja:** al cambiar de pantalla, la nueva entra desde el lado que le toca en el cuaderno (340 ms, 28 px y desde opacidad 0,2): por la derecha si está más abajo en el menú o más adentro (un detalle, un alta), por la izquierda si está más arriba o es la vuelta. La primera pantalla ya está abierta y no se anima.
- **La tinta viaja:** el bloque de tinta del ítem activo se desliza hasta el nuevo, en el menú lateral y en la barra inferior (320 ms), pasando por detrás de los demás ítems.
- **Asentar el plano:** el cartel del día se asienta una vez al cargar ("paste", 420 ms), desde ya visible, recortado desde abajo.
- **La hoja "Más":** sube desde abajo (340 ms) y baja más rápido al cerrarse (200 ms); el fondo se oscurece y aclara con ella.
- **Sello:** un contador rojo que cambia se vuelve a sellar (260 ms, desde escala 1,35).
- **Al presionar:** el ítem se lava en tinta al 10–15% mientras está apretado.
Con movimiento reducido no hay desplazamientos: la hoja se funde en 160 ms, la tinta salta y ni el plano ni el sello se animan.

## Do's and Don'ts

### Do:
- **Do** poner toda pantalla redibujada sobre el papel crema con la cuadrícula de 20 px, añadiendo su ruta a `PAPER_SCREENS`.
- **Do** dar a cada color del aguayo un solo rol: rojo te espera, verde en orden o el bot, amarillo dinero, azul pasos y bolígrafo, rosa el mes.
- **Do** marcar lo activo, lo presionado y el foco en tinta (#231A16).
- **Do** recortar la chakana de 10 px arriba en todo plano de color lleno.
- **Do** escribir a mano (Kalam 700) las fechas, los montos y las advertencias; contar y titular en Archivo condensado pesado.
- **Do** usar el margen para números, checks y pestañas de sección, y poner pestaña solo donde la sección necesita orientación.
- **Do** respetar `prefers-reduced-motion`: sin desplazamientos, solo fundidos cortos.

### Don't:
- **Don't** usar el rojo para navegación, estado activo o decoración.
- **Don't** usar blanco puro como fondo de página; el papel es crema.
- **Don't** armar grillas de tarjetas de métricas iguales sobre fondo oscuro.
- **Don't** redondear esquinas ni poner sombras de elevación.
- **Don't** usar el rosa #E5437A con texto blanco pequeño; el rosa del mes es #D0356B.
- **Don't** mezclar el aspecto oscuro con acento #25D366 dentro de una pantalla de papel.
