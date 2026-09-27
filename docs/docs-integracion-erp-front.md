 # Integración ERP en front-doppel

  ## Resumen

  - Integrar el ERP en el mismo repo con una migración estranguladora: /dashboard pasa a ser el shell del dueño para ERP y el panel actual de WhatsApp
    se absorbe como módulo de automatización.

  - Mantener el auth actual por OTP bajo /connect, pero encapsulado en una capa de sesión para no seguir propagando localStorage y fetch manual por
    cada vista.

  - Priorizar funcionalidad y robustez sobre rediseño visual: reutilizar el sistema visual actual, introducir tipado generado desde OpenAPI,
    validación/runtime guards, manejo de errores uniforme, feature flags por módulo y una base real de pruebas.

  - Tomar /erp/products como catálogo canónico. El módulo de automatización deja de tratar /me/products como fuente primaria.

  ## Cambios de arquitectura

  - Reemplazar el dashboard actual por un shell compartido del dueño con sidebar/header/mobile nav y estados comunes de loading, empty, error.
  - Reubicar el panel actual de WhatsApp a rutas de automatización dentro del nuevo shell:
      - /dashboard/automation
      - /dashboard/automation/business
      - /dashboard/automation/admin-phones
      - Mantener redirects desde las rutas viejas mientras dure la migración.

  - Crear una capa de datos única para toda la app:
      - tipos generados desde OpenAPI
      - cliente HTTP central con normalización de errores, refresh controlado y distinción entre sesión dueño y futura sesión cajero
      - runtime guards para endpoints cuyo OpenAPI hoy está incompleto
      - estado servidor con una librería de cache/invalidation, no useEffect + fetch por pantalla

  - Definir fuentes de verdad por dominio:
      - dueño/tenant/onboarding WhatsApp: /auth/me, /me/tenant, /me/whatsapp, /me/admin-phones, /me/bot-config, /me/business-info
      - ERP operativo: /erp/*
      - catálogo: /erp/products como canon; /me/products queda en compatibilidad o deprecación

  - Añadir módulos nuevos por fases bajo el nuevo shell:
      - overview
      - products
      - inventory
      - sales
      - clients
      - finance
      - reports
      - activity
      - settings
      - automation

  - Mantener /cashier como superficie separada y /demo como superficie pública separada.
  - Estandarizar utilidades transversales:
      - formatBs como único formateador monetario
      - sistema de toasts consistente
      - helpers de localStorage/sessionStorage para onboarding, alertas ignoradas y carrito de caja
      - utilidades de scanner y permisos de cámara

  ## Dependencias y cambios requeridos en backend/OpenAPI

  - Agregar auth de cajero real:
      - POST /erp/auth/pin/login
      - POST /erp/auth/pin/set
      - DELETE /erp/auth/pin
      - JWT de cajero con claims/rol diferenciados

  - Hacer POST /erp/sales idempotente para soportar Reintentar sin riesgo de doble venta.
  - Estandarizar paginación en listas ERP con envelope que incluya items, total, limit, offset; hoy varias listas solo devuelven arrays y eso no
    alcanza para tablas robustas.

  - Completar schemas OpenAPI hoy débiles o {}:
      - /erp/activity
      - /erp/activity/ai
      - /erp/finance/cashflow
      - /erp/reports/top-products
      - /erp/reports/sales-by-period
      - /erp/reports/margin
      - /erp/reports/clients
      - /erp/clients/{id}
      - respuestas de export

  - Formalizar el error envelope en OpenAPI para errores de negocio, no solo 422 de validación.
  - Definir semántica de 404 para barcode lookup; el flujo “no existe -> crear producto con barcode precargado” depende de eso.
  - Evitar fuga de datos sensibles al cajero:
      - los endpoints que use caja no deben exponer cost_price, márgenes ni datos financieros
      - si hace falta, crear variantes/redacciones específicas para cajero

  - Resolver el canon de catálogo:
      - /erp/products como fuente única
      - /me/products pasa a ser compatibilidad/proyección o se depreca

  - Para el overview del dueño, extender GET /erp/reports/dashboard o crear un payload agregado que cubra:
      - ventas del día
      - comparación mensual
      - top 5
      - preview de stock bajo
      - saldos de caja
      - actividad reciente
      - señales para onboarding inicial

  ## Secuencia de entrega

  - Fase 0: base técnica
      - codegen desde OpenAPI
      - cliente API único
      - modelo de errores
      - feature flags por módulo
      - test stack (Vitest/RTL, MSW, Playwright)

  - Fase 1: shell y migración del panel actual
      - nuevo /dashboard
      - mover el panel WhatsApp a automation
      - redirects desde rutas viejas
      - guards de sesión y navegación

  - Fase 2: owner core
      - overview ERP
      - productos
      - inventario
      - clientes
      - reglas de moneda, empty states, confirmaciones destructivas

  - Fase 3: ventas y caja
      - historial/detalle/cancelación de ventas
      - settings de PIN y cajas
      - /cashier con persistencia de carrito, estado de red, scanner, shortcuts, feedback y retries seguros
      - esta fase no se publica sin PIN + idempotencia + redacción de datos para cajero

  - Fase 4: finanzas, reportes, actividad
      - cashflow
      - drill-down
      - exports
      - bitácora con deep-links
      - solo cuando los schemas tipados existan

  - Fase 5: demo pública
      - datos ficticios
      - tour guiado
      - sin dependencia del backend real

  ## Plan de pruebas

  - Contrato:
      - regenerar tipos desde OpenAPI debe compilar sin errores
      - tests de adapters/guards para endpoints inestables

  - Unit/integration:
      - refresh de sesión dueño
      - normalización de errores backend/red/validación
      - formatBs y regla anti .toFixed() en UI
      - helpers de onboarding y alertas ignoradas
      - formularios de productos, inventario, PIN, finanzas
      - cart persistence y network status en caja
      - scanner con fallback manual y manejo de permisos

  - E2E críticos:
      - OTP dueño -> redirección correcta -> dashboard
      - migración y acceso al módulo de automatización
      - CRUD/import/barcode de productos
      - ajuste de inventario con nota obligatoria
      - ventas: listado, detalle, cancelación
      - caja: login PIN, búsqueda, escaneo, stock insuficiente, caída de red, reintento idempotente, restauración de carrito
      - reportes/finanzas: filtro por período y drill-down
      - activity: deep-link a entidad
      - demo: tour solo primera vez

  ## Supuestos y defaults

  - /connect sigue siendo la entrada de auth del dueño en esta etapa; no se introduce /login separado todavía.
  - El ERP del dueño conserva inicialmente el lenguaje visual actual del repo; no se hace retema global para reducir riesgo.
  - Las imágenes de producto arrancan con image_url manual o vacío; upload real a Storage queda para una fase posterior.
  - Ningún módulo con contrato incompleto entra a navegación principal sin feature flag.
  - No se intenta SSR auth real hasta que backend soporte una sesión más segura que localStorage.

