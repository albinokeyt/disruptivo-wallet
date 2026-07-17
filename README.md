# Disruptivo Wallet

Pasarela central de cobros del **Departamento Disruptivo**: una sola app que habla con la **Wallet Charges API** del marketplace de GoHighLevel y expone su propia API para que tus otras apps (Hermes Setter, herramientas futuras…) cobren del **wallet nativo de GHL** de cada subcuenta — sin pasarelas externas ni saldos aparte.

```
Tus apps (Hermes, …)  ──API key──▶  Disruptivo Wallet  ──OAuth──▶  Wallet de GHL (subcuenta)
                                        │
                                        └─ ledger local: apps, tarifas, cobros, reembolsos
```

**Cómo llega el dinero:** GHL descuenta del wallet del cliente y liquida al developer vía **Tipalti el día 15 de cada mes** (comisión 0% hasta el 31/12/2026). Esta app centraliza y contabiliza; GHL cobra y te paga.

## Stack

Node 22 + Fastify + Postgres + Redis, panel React (Vite + Tailwind v4). Un solo contenedor Docker.

## Despliegue en EasyPanel

1. Crea 3 servicios en un proyecto:
   - **disruptivo-wallet-db** → Postgres 17 (guarda la contraseña)
   - **disruptivo-wallet-redis** → Redis 7
   - **wallet** → App desde este repo de GitHub (build con Dockerfile)
2. Variables de entorno del servicio **wallet** (ver `.env.example`):

| Variable | Valor |
|---|---|
| `PORT` | `8080` |
| `DATABASE_URL` | `postgres://postgres:<pass>@disruptivo-wallet-db:5432/disruptivo_wallet` |
| `REDIS_URL` | `redis://disruptivo-wallet-redis:6379` |
| `ADMIN_USER` / `ADMIN_PASS` | login del panel |
| `APP_BASE_URL` | URL pública, p. ej. `https://wallet.escaladoacelerado.es` |

3. Apunta el dominio al puerto 8080. Las migraciones corren solas al arrancar.

## Configurar la app del marketplace de GHL

Los cobros al wallet **exigen una app del marketplace** (un PIT no puede crear cargos):

1. En [marketplace.gohighlevel.com](https://marketplace.gohighlevel.com) crea (o reutiliza) una app con:
   - Distribution: **Sub-Account**
   - Scopes: `charges.write`, `charges.readonly`, `oauth.readonly`, `locations.readonly`
   - Redirect URL: `https://<tu-dominio>/api/oauth/callback` (la ruta no lleva referencias a GHL; el marketplace las rechaza)
2. En **App → Pricing → Billing Meters** crea tus meters (tipo *Custom Event (API)*): unidad, precio por defecto y, si quieres precio variable, tipo *Dynamic* con mínimo/máximo. **Ahí es donde defines tu margen.**
3. En el panel de Disruptivo Wallet → **Configuración** pega `client_id`, `client_secret` y `app_id`.
4. En **Tarifas** registra cada meter con su `meterId` de GHL y un código corto (p. ej. `mensajes-ia`).
5. En **Conexiones → Conectar subcuenta** instala la app en cada subcuenta cliente (OAuth). Con eso ya se le puede cobrar.

> El wallet del cliente se recarga solo (auto-recharge nativo de GHL con su tarjeta): el cliente no gestiona ningún saldo externo. Con el rebilling de agencia activado paga el wallet de la subcuenta; sin él, el de la agencia.

## API para tus apps

Autenticación: header `Authorization: Bearer dw_…` (o `X-Api-Key`). Las claves se crean en el panel → **Apps** y solo se muestran una vez.

### Cobrar

```bash
curl -X POST https://wallet.tudominio.com/api/v1/charges \
  -H "Authorization: Bearer dw_..." \
  -H "Content-Type: application/json" \
  -d '{
    "location_id": "ewGlt5YqA8PHR1qJWLhC",
    "meter": "mensajes-ia",
    "units": 3,
    "event_id": "hermes-conv842-lote7",
    "description": "3 mensajes de IA",
    "price": 0.015
  }'
```

- `event_id` es tu identificador único → **idempotencia**: repetir la llamada no duplica el cargo (los fallidos sí se reintentan).
- `price` solo se admite si la tarifa es dinámica, y se valida contra su mínimo/máximo.
- Respuesta `201`: `{ "test_mode": false, "charge": { "id", "status": "created", "ghl_charge_id", "amount", … } }`
- Si GHL **rechaza** el cargo (4xx): `502` y el cargo queda `failed` → reintenta con el mismo `event_id`.
- Si GHL **no confirma** (timeout/red): el cargo queda `unknown` → reintenta con el mismo `event_id`; el gateway consulta primero en GHL si el intento anterior llegó a cobrarse (**reconciliación**) y solo re-ejecuta si GHL confirma que no.

Estados del cargo: `pending` (en vuelo) · `created` (cobrado) · `test` · `failed` (GHL lo rechazó, reintentable) · `unknown` (sin confirmación, se reconcilia al reintentar) · `refunded`.

### Resto de endpoints

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/api/v1/locations/:locationId/has-funds` | ¿Tiene saldo el wallet? Compruébalo antes de servir. |
| `GET` | `/api/v1/charges?location_id=&status=&limit=` | Historial de cobros de tu app |
| `DELETE` | `/api/v1/charges/:id` | Reembolso (borra el cargo en GHL) |
| `GET` | `/api/v1/meters` | Tarifas activas |
| `GET` | `/api/v1/locations` | Subcuentas conectadas |

### Modo prueba

Tres niveles (global en Configuración, por conexión, por app). En prueba el cobro se registra en el ledger con estado `test` y **no toca el wallet de GHL**. Útil porque GHL no tiene sandbox de billing.

## Desarrollo local

```bash
npm install && cd web && npm install && cd ..
# necesita un Postgres y un Redis (ajusta DATABASE_URL/REDIS_URL)
npm run dev            # API en :8080
cd web && npm run dev  # panel en :5173 con proxy a /api
```

## Notas de seguridad

- Las API keys se guardan hasheadas (SHA-256); solo se muestran al crearlas.
- **Alcance por app**: cada API key puede limitarse a ciertas subcuentas (panel → Apps → «Subcuentas»). Por defecto puede cobrar a todas.
- El OAuth usa `state` anti-CSRF cuando se inicia desde el panel. Para permitir que un cliente instale la app directamente desde GHL (sin pasar por el panel), configura el **Company ID** de tu agencia en Configuración — instalaciones de otras agencias se rechazan.
- Login del panel con límite de intentos (10 fallos / 15 min por IP).
- Los tokens OAuth de GHL se guardan en Postgres — mantén el repo y la base privados.
- El refresh de tokens es de un solo uso: está serializado con lock en Redis y con timeouts acotados.
- Cobros en USD (única moneda soportada por la Wallet Charges API).
