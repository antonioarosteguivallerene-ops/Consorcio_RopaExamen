"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { productoSchema, type ProductoInput } from "@/lib/schemas";
import { crearProducto } from "@/actions/inventario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function NuevoProducto() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<ProductoInput>({
    resolver: zodResolver(productoSchema),
  });

  const onSubmit = (v: ProductoInput) =>
    start(async () => {
      const res = await crearProducto(v);
      if (res.ok) { toast.success(res.message); reset(); setOpen(false); }
      else {
        toast.error(res.error);
        // Errores por campo devueltos por el servidor (doble validación con Zod)
        Object.entries(res.fieldErrors ?? {}).forEach(([k, msgs]) =>
          msgs?.[0] && setError(k as keyof ProductoInput, { message: msgs[0] })
        );
      }
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="h-4 w-4" />Nuevo producto</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nuevo producto</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          <Field label="Código de barras" error={errors.codigo_barras?.message}><Input maxLength={32} {...register("codigo_barras")} /></Field>
          <Field label="Nombre" error={errors.nombre?.message}><Input maxLength={120} {...register("nombre")} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoría" error={errors.categoria?.message}><Input {...register("categoria")} /></Field>
            <Field label="Talla (opcional)" error={errors.talla?.message}><Input maxLength={10} {...register("talla")} /></Field>
          </div>
          <Field label="Precio (USD)" error={errors.precio?.message}><Input type="number" step="0.01" min="0.01" {...register("precio")} /></Field>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} Guardar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
