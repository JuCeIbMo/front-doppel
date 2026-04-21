# Doppel Frontend

Frontend de Doppel construido con Next.js App Router.

## Variables de entorno

Copia `.env.local.example` a `.env.local` y completa:

```bash
NEXT_PUBLIC_META_APP_ID=
NEXT_PUBLIC_META_CONFIG_ID=
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run start
```

Si PowerShell bloquea `npm`, usa `npm.cmd`.

## Flujo principal

- `/` landing de producto
- `/connect` onboarding con OTP + Meta Embedded Signup
- `/connect/success` confirmacion de conexion
- `/dashboard` configuracion del bot, estado del tenant e historial reciente
- `/privacy`, `/terms`, `/data-deletion` paginas legales

## Checklist local

1. Levanta el backend en `http://localhost:8000`.
2. Ejecuta `npm.cmd run dev`.
3. Completa el flujo OTP -> connect -> success -> dashboard.
4. Ejecuta `npm.cmd run lint`.
5. Ejecuta `npm.cmd run build`.
