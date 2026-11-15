-- =====================================================================
-- Consorcio de 4 tiendas de ropa usada - Esquema PostgreSQL (Supabase)
-- Ejecutar completo en: Supabase > SQL Editor
-- =====================================================================

-- ---------- TABLAS ----------------------------------------------------

create table public.sucursales (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null unique check (length(trim(nombre)) >= 2),
  direccion  text,
  activa     boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.perfiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nombre      text not null check (length(trim(nombre)) >= 2),
  rol         text not null default 'cajero' check (rol in ('cajero','gerente','admin')),
  sucursal_id uuid references public.sucursales(id),
  created_at  timestamptz not null default now()
);
-- Un usuario recién registrado nace como cajero sin sucursal hasta que el admin se la asigne;
-- mientras tanto las funciones RPC le niegan vender (PERMISO_DENEGADO).

create table public.productos (
  id            uuid primary key default gen_random_uuid(),
  codigo_barras text not null unique check (codigo_barras ~ '^[A-Za-z0-9-]{4,32}$'),
  nombre        text not null check (length(trim(nombre)) >= 2),
  categoria     text not null,
  talla         text,
  precio        numeric(10,2) not null check (precio > 0),
  activo        boolean not null default true,
  created_at    timestamptz not null default now()
);

create table public.inventario (
  sucursal_id uuid not null references public.sucursales(id),
  producto_id uuid not null references public.productos(id),
  stock       integer not null default 0 check (stock >= 0),   -- nunca stock negativo
  updated_at  timestamptz not null default now(),
  primary key (sucursal_id, producto_id)
);

create table public.ventas (
  id           uuid primary key default gen_random_uuid(),
  sucursal_id  uuid not null references public.sucursales(id),
  cajero_id    uuid not null references public.perfiles(id),
  metodo_pago  text not null check (metodo_pago in ('efectivo','tarjeta','transferencia')),
  total        numeric(12,2) not null default 0 check (total >= 0),
  estado       text not null default 'completada' check (estado in ('completada','anulada')),
  anulada_por  uuid,
  motivo_anulacion text,
  created_at   timestamptz not null default now()
);

create table public.venta_items (
  id              uuid primary key default gen_random_uuid(),
  venta_id        uuid not null references public.ventas(id) on delete cascade,
  producto_id     uuid not null references public.productos(id),
  cantidad        integer not null check (cantidad > 0),
  precio_unitario numeric(10,2) not null check (precio_unitario > 0)
);

create table public.movimientos_inventario (
  id          bigint generated always as identity primary key,
  sucursal_id uuid not null references public.sucursales(id),
  producto_id uuid not null references public.productos(id),
  tipo        text not null check (tipo in ('venta','anulacion','ajuste','transferencia_salida','transferencia_entrada')),
  cantidad    integer not null check (cantidad <> 0),   -- negativo = sale, positivo = entra
  detalle     text,
  usuario_id  uuid,
  created_at  timestamptz not null default now()
);

create table public.auditoria (
  id          bigint generated always as identity primary key,
  tabla       text not null,
  operacion   text not null,
  registro_id text,
  usuario_id  uuid,
  antes       jsonb,
  despues     jsonb,
  created_at  timestamptz not null default now()
);

create index on public.inventario (producto_id);
create index on public.ventas (sucursal_id, created_at desc);
create index on public.venta_items (venta_id);
create index on public.movimientos_inventario (sucursal_id, created_at desc);

-- ---------- FUNCIONES AUXILIARES (para RLS) ---------------------------

create or replace function public.mi_rol() returns text
language sql stable security definer set search_path = public as
$$ select rol from public.perfiles where id = auth.uid() $$;

create or replace function public.mi_sucursal() returns uuid
language sql stable security definer set search_path = public as
$$ select sucursal_id from public.perfiles where id = auth.uid() $$;

-- ---------- PERFIL AUTOMÁTICO AL REGISTRAR UN USUARIO -----------------

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, nombre, rol)
  values (new.id,
          coalesce(nullif(trim(new.raw_user_meta_data->>'nombre'), ''), split_part(new.email, '@', 1)),
          'cajero');
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- AUDITORÍA (trigger genérico) ------------------------------

create or replace function public.fn_auditar() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_fila jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  insert into public.auditoria (tabla, operacion, registro_id, usuario_id, antes, despues)
  values (
    tg_table_name,
    tg_op,
    coalesce(v_fila->>'id', (v_fila->>'sucursal_id') || ':' || (v_fila->>'producto_id')),
    auth.uid(),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );
  return null;
end $$;

create trigger aud_productos  after insert or update or delete on public.productos  for each row execute function public.fn_auditar();
create trigger aud_inventario after insert or update or delete on public.inventario for each row execute function public.fn_auditar();
create trigger aud_ventas     after insert or update or delete on public.ventas     for each row execute function public.fn_auditar();
create trigger aud_perfiles   after update or delete on public.perfiles             for each row execute function public.fn_auditar();

-- Las ventas no se borran: solo se anulan
create or replace function public.fn_bloquear_borrado() returns trigger
language plpgsql as $$
begin
  raise exception 'PERMISO_DENEGADO: los registros de ventas no se pueden eliminar, solo anular';
end $$;

create trigger no_borrar_ventas before delete on public.ventas
  for each row execute function public.fn_bloquear_borrado();

-- ---------- ROW LEVEL SECURITY ---------------------------------------

alter table public.sucursales               enable row level security;
alter table public.perfiles                 enable row level security;
alter table public.productos                enable row level security;
alter table public.inventario               enable row level security;
alter table public.ventas                   enable row level security;
alter table public.venta_items              enable row level security;
alter table public.movimientos_inventario   enable row level security;
alter table public.auditoria                enable row level security;

create policy sucursales_select on public.sucursales
  for select to authenticated using (true);

create policy perfiles_select on public.perfiles
  for select to authenticated
  using (id = auth.uid() or public.mi_rol() = 'admin' or sucursal_id = public.mi_sucursal());

-- Catálogo compartido por todo el consorcio; solo gerentes/admin lo modifican
create policy productos_select on public.productos
  for select to authenticated using (true);
create policy productos_insert on public.productos
  for insert to authenticated with check (public.mi_rol() in ('gerente','admin'));
create policy productos_update on public.productos
  for update to authenticated using (public.mi_rol() in ('gerente','admin'))
  with check (public.mi_rol() in ('gerente','admin'));

-- Datos aislados por sucursal (el admin ve todo). Sin políticas de escritura:
-- inventario, ventas y movimientos solo se modifican mediante las funciones RPC.
create policy inventario_select on public.inventario
  for select to authenticated
  using (public.mi_rol() = 'admin' or sucursal_id = public.mi_sucursal());

create policy ventas_select on public.ventas
  for select to authenticated
  using (public.mi_rol() = 'admin' or sucursal_id = public.mi_sucursal());

create policy venta_items_select on public.venta_items
  for select to authenticated
  using (exists (select 1 from public.ventas v
                 where v.id = venta_id
                   and (public.mi_rol() = 'admin' or v.sucursal_id = public.mi_sucursal())));

create policy movimientos_select on public.movimientos_inventario
  for select to authenticated
  using (public.mi_rol() = 'admin' or sucursal_id = public.mi_sucursal());

create policy auditoria_select on public.auditoria
  for select to authenticated using (public.mi_rol() = 'admin');

-- ---------- FUNCIONES RPC TRANSACCIONALES ----------------------------
-- Cada función es una sola transacción: si algo falla, TODO se revierte.
-- Los errores de negocio usan el formato  CODIGO: mensaje  para que la app
-- los traduzca a mensajes amigables sin exponer detalles técnicos.

create or replace function public.registrar_venta(
  p_sucursal uuid, p_metodo text, p_items jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_rol text; v_suc uuid; v_venta uuid;
  v_total numeric(12,2) := 0;
  r record; v_stock int; v_precio numeric(10,2); v_nombre text;
begin
  select rol, sucursal_id into v_rol, v_suc from perfiles where id = auth.uid();
  if v_rol is null then
    raise exception 'PERMISO_DENEGADO: tu usuario no tiene perfil asignado';
  end if;
  if v_rol <> 'admin' and v_suc is distinct from p_sucursal then
    raise exception 'PERMISO_DENEGADO: no puedes vender en otra sucursal';
  end if;
  if not exists (select 1 from sucursales where id = p_sucursal and activa) then
    raise exception 'VALIDACION: la sucursal no existe o está inactiva';
  end if;
  if p_metodo is null or p_metodo not in ('efectivo','tarjeta','transferencia') then
    raise exception 'VALIDACION: método de pago no válido';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'VALIDACION: la venta debe tener al menos un producto';
  end if;

  insert into ventas (sucursal_id, cajero_id, metodo_pago)
  values (p_sucursal, auth.uid(), p_metodo) returning id into v_venta;

  -- Se agrupa por producto y se ordena para bloquear filas siempre en el mismo orden (evita deadlocks)
  for r in
    select (e->>'producto_id')::uuid as producto_id, sum((e->>'cantidad')::int)::int as cantidad
    from jsonb_array_elements(p_items) e
    group by 1 order by 1
  loop
    if r.producto_id is null or r.cantidad is null or r.cantidad <= 0 then
      raise exception 'VALIDACION: producto o cantidad no válidos';
    end if;

    -- Bloqueo de fila: dos cajeros no pueden vender la misma prenda a la vez
    select i.stock, p.precio, p.nombre
      into v_stock, v_precio, v_nombre
      from inventario i join productos p on p.id = i.producto_id
     where i.sucursal_id = p_sucursal and i.producto_id = r.producto_id and p.activo
       for update of i;

    if not found then
      raise exception 'PRODUCTO_NO_DISPONIBLE: uno de los productos no está disponible en esta sucursal';
    end if;
    if v_stock < r.cantidad then
      raise exception 'STOCK_INSUFICIENTE: "%" solo tiene % unidad(es) disponible(s)', v_nombre, v_stock;
    end if;

    update inventario set stock = stock - r.cantidad, updated_at = now()
     where sucursal_id = p_sucursal and producto_id = r.producto_id;

    insert into venta_items (venta_id, producto_id, cantidad, precio_unitario)
    values (v_venta, r.producto_id, r.cantidad, v_precio);   -- el precio sale de la BD, no del cliente

    insert into movimientos_inventario (sucursal_id, producto_id, tipo, cantidad, detalle, usuario_id)
    values (p_sucursal, r.producto_id, 'venta', -r.cantidad, 'Venta ' || v_venta, auth.uid());

    v_total := v_total + v_precio * r.cantidad;
  end loop;

  update ventas set total = v_total where id = v_venta;
  return v_venta;
exception
  when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'VALIDACION: los datos de los productos no son válidos';
end $$;

create or replace function public.anular_venta(p_venta uuid, p_motivo text)
returns void
language plpgsql security definer set search_path = public as $$
declare v_rol text; v_suc uuid; v_v ventas%rowtype; r record;
begin
  select rol, sucursal_id into v_rol, v_suc from perfiles where id = auth.uid();
  if v_rol is null or v_rol not in ('gerente','admin') then
    raise exception 'PERMISO_DENEGADO: solo gerentes o administradores pueden anular ventas';
  end if;
  if p_motivo is null or length(trim(p_motivo)) < 3 then
    raise exception 'VALIDACION: indica el motivo de la anulación';
  end if;

  select * into v_v from ventas where id = p_venta for update;
  if not found then raise exception 'NO_ENCONTRADO: la venta no existe'; end if;
  if v_rol = 'gerente' and v_v.sucursal_id is distinct from v_suc then
    raise exception 'PERMISO_DENEGADO: no puedes anular ventas de otra sucursal';
  end if;
  if v_v.estado = 'anulada' then
    raise exception 'VENTA_YA_ANULADA: esta venta ya fue anulada';
  end if;

  for r in select producto_id, sum(cantidad)::int as cantidad
             from venta_items where venta_id = p_venta group by 1 order by 1
  loop
    insert into inventario (sucursal_id, producto_id, stock)
    values (v_v.sucursal_id, r.producto_id, r.cantidad)
    on conflict (sucursal_id, producto_id)
    do update set stock = inventario.stock + excluded.stock, updated_at = now();

    insert into movimientos_inventario (sucursal_id, producto_id, tipo, cantidad, detalle, usuario_id)
    values (v_v.sucursal_id, r.producto_id, 'anulacion', r.cantidad, 'Anulación venta ' || p_venta, auth.uid());
  end loop;

  update ventas set estado = 'anulada', anulada_por = auth.uid(), motivo_anulacion = trim(p_motivo)
   where id = p_venta;
end $$;

create or replace function public.ajustar_stock(
  p_sucursal uuid, p_producto uuid, p_delta int, p_motivo text
) returns int
language plpgsql security definer set search_path = public as $$
declare v_rol text; v_suc uuid; v_stock int;
begin
  select rol, sucursal_id into v_rol, v_suc from perfiles where id = auth.uid();
  if v_rol is null or v_rol not in ('gerente','admin') then
    raise exception 'PERMISO_DENEGADO: solo gerentes o administradores pueden ajustar inventario';
  end if;
  if v_rol = 'gerente' and v_suc is distinct from p_sucursal then
    raise exception 'PERMISO_DENEGADO: no puedes modificar el inventario de otra sucursal';
  end if;
  if p_delta is null or p_delta = 0 then
    raise exception 'VALIDACION: el ajuste no puede ser cero';
  end if;
  if p_motivo is null or length(trim(p_motivo)) < 3 then
    raise exception 'VALIDACION: indica el motivo del ajuste';
  end if;
  if not exists (select 1 from productos where id = p_producto) then
    raise exception 'NO_ENCONTRADO: el producto no existe';
  end if;

  insert into inventario (sucursal_id, producto_id, stock)
  values (p_sucursal, p_producto, 0) on conflict do nothing;

  select stock into v_stock from inventario
   where sucursal_id = p_sucursal and producto_id = p_producto for update;

  if v_stock + p_delta < 0 then
    raise exception 'STOCK_INSUFICIENTE: el ajuste dejaría el stock en negativo (actual: %)', v_stock;
  end if;

  update inventario set stock = stock + p_delta, updated_at = now()
   where sucursal_id = p_sucursal and producto_id = p_producto;

  insert into movimientos_inventario (sucursal_id, producto_id, tipo, cantidad, detalle, usuario_id)
  values (p_sucursal, p_producto, 'ajuste', p_delta, trim(p_motivo), auth.uid());

  return v_stock + p_delta;
end $$;

create or replace function public.transferir_stock(
  p_origen uuid, p_destino uuid, p_producto uuid, p_cantidad int
) returns void
language plpgsql security definer set search_path = public as $$
declare v_rol text; v_suc uuid; v_stock int;
begin
  select rol, sucursal_id into v_rol, v_suc from perfiles where id = auth.uid();
  if v_rol is null or v_rol not in ('gerente','admin') then
    raise exception 'PERMISO_DENEGADO: solo gerentes o administradores pueden transferir inventario';
  end if;
  if v_rol = 'gerente' and v_suc is distinct from p_origen then
    raise exception 'PERMISO_DENEGADO: solo puedes transferir desde tu propia sucursal';
  end if;
  if p_origen = p_destino then
    raise exception 'VALIDACION: la sucursal de origen y destino deben ser distintas';
  end if;
  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'VALIDACION: la cantidad debe ser mayor que cero';
  end if;
  if not exists (select 1 from sucursales where id = p_destino and activa) then
    raise exception 'VALIDACION: la sucursal de destino no existe o está inactiva';
  end if;

  insert into inventario (sucursal_id, producto_id, stock)
  values (p_origen, p_producto, 0), (p_destino, p_producto, 0) on conflict do nothing;

  -- Bloqueo en orden fijo (por id de sucursal) para evitar deadlocks entre transferencias cruzadas
  perform 1 from inventario
   where producto_id = p_producto and sucursal_id in (p_origen, p_destino)
   order by sucursal_id for update;

  select stock into v_stock from inventario where sucursal_id = p_origen and producto_id = p_producto;
  if v_stock < p_cantidad then
    raise exception 'STOCK_INSUFICIENTE: la sucursal de origen solo tiene % unidad(es)', v_stock;
  end if;

  update inventario set stock = stock - p_cantidad, updated_at = now()
   where sucursal_id = p_origen and producto_id = p_producto;
  update inventario set stock = stock + p_cantidad, updated_at = now()
   where sucursal_id = p_destino and producto_id = p_producto;

  insert into movimientos_inventario (sucursal_id, producto_id, tipo, cantidad, detalle, usuario_id)
  values (p_origen,  p_producto, 'transferencia_salida',  -p_cantidad, 'Hacia ' || p_destino,  auth.uid()),
         (p_destino, p_producto, 'transferencia_entrada',  p_cantidad, 'Desde ' || p_origen,   auth.uid());
end $$;

-- Solo usuarios autenticados pueden invocar las RPC
revoke all on function public.registrar_venta(uuid, text, jsonb)       from public, anon;
revoke all on function public.anular_venta(uuid, text)                  from public, anon;
revoke all on function public.ajustar_stock(uuid, uuid, int, text)      from public, anon;
revoke all on function public.transferir_stock(uuid, uuid, uuid, int)   from public, anon;
grant execute on function public.registrar_venta(uuid, text, jsonb)     to authenticated;
grant execute on function public.anular_venta(uuid, text)                to authenticated;
grant execute on function public.ajustar_stock(uuid, uuid, int, text)    to authenticated;
grant execute on function public.transferir_stock(uuid, uuid, uuid, int) to authenticated;
