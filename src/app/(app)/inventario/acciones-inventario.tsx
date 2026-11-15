"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeftRight, Loader2, SlidersHorizontal } from "lucide-react";
import { ajusteSchema, transferenciaSchema, type AjusteInput, type TransferenciaInput } from "@/lib/schemas";
import { ajustarStock, transferirStock } from "@/actions/inventario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, selectClass } from "@/components/ui/field";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Suc = { id: string; nombre: string };
type Prod = { id: string; nombre: string; talla: string | null };

export function AcionesInventario({
  sucursales,
  productos,
  sucursalPropia,
}: {
  sucursales: Suc[];
  productos: Prod[];
  sucursalPropia: string | null; // gerente: fija su sucursal
}) {
  return (
    <div className="flex gap-2">
      <AjusteDialog sucursales={sucursales} productos={productos} sucursalPropia={sucursalPropia} />
      <TransferenciaDialog sucursales={sucursales} productos={productos} sucursalPropia={sucursalPropia} />
    </div>
  );
}

function ProductoSelect({ productos, ...props }: { productos: Prod[] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={selectClass} {...props}>
      <option value="">Selecciona…</option>
      {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}{p.talla ? ` (${p.talla})` : ""}</option>)}
    </select>
  );
}

function AjusteDialog({ sucursales, productos, sucursalPropia }: { sucursales: Suc[]; productos: Prod[]; sucursalPropia: string | null }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<AjusteInput>({
    resolver: zodResolver(ajusteSchema),
    defaultValues: { sucursal_id: sucursalPropia ?? "", producto_id: "", motivo: "" },
  });

  const onSubmit = (v: AjusteInput) =>
    start(async () => {
      const res = await ajustarStock(v);
      if (res.ok) { toast.success(res.message); reset(); setOpen(false); }
      else toast.error(res.error);
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline"><SlidersHorizontal className="h-4 w-4" />Ajustar stock</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar stock</DialogTitle>
          <DialogDescription>Usa números positivos para ingresos y negativos para pérdidas o correcciones.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          <Field label="Sucursal" error={errors.sucursal_id?.message}>
            <select className={selectClass} disabled={!!sucursalPropia} {...register("sucursal_id")}>
              <option value="">Selecciona…</option>
              {sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </Field>
          <Field label="Producto" error={errors.producto_id?.message}>
            <ProductoSelect productos={productos} {...register("producto_id")} />
          </Field>
          <Field label="Cantidad (+/−)" error={errors.delta?.message}>
            <Input type="number" step="1" {...register("delta")} />
          </Field>
          <Field label="Motivo" error={errors.motivo?.message}>
            <Input maxLength={200} {...register("motivo")} />
          </Field>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} Guardar ajuste
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TransferenciaDialog({ sucursales, productos, sucursalPropia }: { sucursales: Suc[]; productos: Prod[]; sucursalPropia: string | null }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<TransferenciaInput>({
    resolver: zodResolver(transferenciaSchema),
    defaultValues: { origen: sucursalPropia ?? "", destino: "", producto_id: "" },
  });

  const onSubmit = (v: TransferenciaInput) =>
    start(async () => {
      const res = await transferirStock(v);
      if (res.ok) { toast.success(res.message); reset(); setOpen(false); }
      else toast.error(res.error);
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><ArrowLeftRight className="h-4 w-4" />Transferir</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transferir entre sucursales</DialogTitle>
          <DialogDescription>El movimiento es atómico: o se descuenta y se agrega, o no pasa nada.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          <Field label="Origen" error={errors.origen?.message}>
            <select className={selectClass} disabled={!!sucursalPropia} {...register("origen")}>
              <option value="">Selecciona…</option>
              {sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </Field>
          <Field label="Destino" error={errors.destino?.message}>
            <select className={selectClass} {...register("destino")}>
              <option value="">Selecciona…</option>
              {sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </Field>
          <Field label="Producto" error={errors.producto_id?.message}>
            <ProductoSelect productos={productos} {...register("producto_id")} />
          </Field>
          <Field label="Cantidad" error={errors.cantidad?.message}>
            <Input type="number" step="1" min={1} {...register("cantidad")} />
          </Field>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} Transferir
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
