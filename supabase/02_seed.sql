-- =====================================================================
-- Datos de prueba: 4 sucursales, 12 productos e inventario por sucursal.
-- Ejecutar DESPUÉS de 01_schema.sql
-- =====================================================================

insert into public.sucursales (id, nombre, direccion) values
  ('11111111-1111-1111-1111-111111111111', 'Sucursal Centro',    'Av. Central, frente al parque'),
  ('22222222-2222-2222-2222-222222222222', 'Sucursal Norte',     'Barrio Norte, 2c al lago'),
  ('33333333-3333-3333-3333-333333333333', 'Sucursal Sur',       'Carretera Sur km 5'),
  ('44444444-4444-4444-4444-444444444444', 'Sucursal Mercado',   'Mercado Municipal, local 12')
on conflict do nothing;

insert into public.productos (id, codigo_barras, nombre, categoria, talla, precio) values
  ('a0000000-0000-0000-0000-000000000001', '7501000000011', 'Camisa de mezclilla',      'Camisas',   'M',  8.50),
  ('a0000000-0000-0000-0000-000000000002', '7501000000028', 'Jeans clásico azul',       'Pantalones','32', 12.00),
  ('a0000000-0000-0000-0000-000000000003', '7501000000035', 'Chaqueta de cuero',        'Chaquetas', 'L',  35.00),
  ('a0000000-0000-0000-0000-000000000004', '7501000000042', 'Vestido floreado',         'Vestidos',  'S',  15.00),
  ('a0000000-0000-0000-0000-000000000005', '7501000000059', 'Suéter de lana',           'Suéteres',  'M',  14.50),
  ('a0000000-0000-0000-0000-000000000006', '7501000000066', 'Camiseta deportiva',       'Camisetas', 'L',  5.00),
  ('a0000000-0000-0000-0000-000000000007', '7501000000073', 'Short de playa',           'Shorts',    'M',  6.00),
  ('a0000000-0000-0000-0000-000000000008', '7501000000080', 'Falda plisada',            'Faldas',    'S',  9.00),
  ('a0000000-0000-0000-0000-000000000009', '7501000000097', 'Abrigo de invierno',       'Abrigos',   'XL', 40.00),
  ('a0000000-0000-0000-0000-000000000010', '7501000000103', 'Blusa de seda',            'Blusas',    'M',  11.00),
  ('a0000000-0000-0000-0000-000000000011', '7501000000110', 'Pantalón cargo',           'Pantalones','34', 13.50),
  ('a0000000-0000-0000-0000-000000000012', '7501000000127', 'Gorra de béisbol',         'Accesorios','U',  4.00)
on conflict do nothing;

-- Inventario: todas las sucursales reciben todos los productos con stock distinto
insert into public.inventario (sucursal_id, producto_id, stock)
select s.id, p.id, 3 + ((row_number() over (order by s.id, p.id))::int % 8)
from public.sucursales s cross join public.productos p
on conflict do nothing;

-- ---------------------------------------------------------------------
-- ASIGNAR ROLES (después de crear 3-4 usuarios en Supabase > Authentication > Users)
-- Reemplaza los correos por los tuyos y ejecuta:
--
-- update public.perfiles set rol = 'admin'
--  where id = (select id from auth.users where email = 'admin@consorcio.test');
--
-- update public.perfiles set rol = 'gerente',
--        sucursal_id = '11111111-1111-1111-1111-111111111111'
--  where id = (select id from auth.users where email = 'gerente@consorcio.test');
--
-- update public.perfiles set rol = 'cajero',
--        sucursal_id = '11111111-1111-1111-1111-111111111111'
--  where id = (select id from auth.users where email = 'cajero@consorcio.test');
-- ---------------------------------------------------------------------
