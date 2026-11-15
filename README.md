# Sistema de ventas e inventario – Consorcio de 4 tiendas de ropa usada

Next.js (App Router) + TypeScript + Tailwind + Shadcn/UI + Supabase (PostgreSQL, Auth, RLS, PL/pgSQL).

## 1. Base de datos (Supabase)

1. Crea un proyecto en https://supabase.com.
2. En **SQL Editor** ejecuta, en orden:
   - `supabase/01_schema.sql` (tablas, constraints, triggers de auditoría, RLS, funciones RPC)
   - `supabase/02_seed.sql` (4 sucursales, 12 productos, inventario de prueba)
3. En **Authentication > Users** crea 3 usuarios (admin, gerente, cajero) con correo y contraseña.
   Desactiva "Confirm email" si quieres entrar sin confirmar.
4. Asigna roles con los `update` comentados al final de `02_seed.sql`.

## 2. Aplicación

```bash
npm install
cp .env.example .env.local   # pega la URL y la anon key (Project Settings > API)
npm run dev                  # http://localhost:3000
```

> La cámara (html5-qrcode) requiere HTTPS o `localhost`.

## 3. Roles

| Rol      | Puede                                                                                     |
|----------|-------------------------------------------------------------------------------------------|
| cajero   | Vender en su sucursal, ver su inventario y sus ventas                                     |
| gerente  | Lo anterior + anular ventas, ajustar/transferir stock desde su sucursal, gestionar catálogo |
| admin    | Todo, en todas las sucursales (puede cambiar de sucursal en el POS)                       |

## 4. Validaciones y excepciones

- **Cliente**: React Hook Form + Zod (campos vacíos, precios > 0, cantidades enteras, etc.).
- **Servidor**: los mismos esquemas Zod se reejecutan en cada Server Action.
- **Base de datos**: `CHECK` (precio > 0, stock >= 0, cantidad > 0), `UNIQUE` (código de barras), FK, RLS por sucursal.
- **Transacciones**: `registrar_venta`, `anular_venta`, `ajustar_stock` y `transferir_stock` son funciones PL/pgSQL;
  `registrar_venta` bloquea filas con `FOR UPDATE` para que dos cajeros no vendan la misma prenda.
  El precio se toma de la BD, nunca del cliente.
- **Excepciones**: la BD lanza `CODIGO: mensaje`; `src/lib/errors.ts` lo traduce a un mensaje amigable
  (Sonner) y registra los errores técnicos solo en el log del servidor.
- **Auditoría**: triggers sobre productos, inventario, ventas y perfiles (tabla `auditoria`); las ventas no se pueden borrar, solo anular.

## 5. Prueba rápida de concurrencia

Abre el POS en dos navegadores con usuarios de la misma sucursal, agrega el último artículo de un
producto en ambos y cobra a la vez: uno vende y el otro recibe "STOCK_INSUFICIENTE".
