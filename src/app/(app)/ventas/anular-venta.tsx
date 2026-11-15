"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Ban, Loader2 } from "lucide-react";
import { z } from "zod";
import { anulacionSchema } from "@/lib/schemas";
import { anularVenta } from "@/actions/ventas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const formSchema = anulacionSchema.pick({ motivo: true });

export function AnularVenta({ ventaId }: { ventaId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = (v: z.infer<typeof formSchema>) =>
    start(async () => {
      const res = await anularVenta({ venta_id: ventaId, motivo: v.motivo });
      if (res.ok) {
        toast.success(res.message);
        reset();
        setOpen(false);
      } else toast.error(res.error);
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Ban className="h-4 w-4" />Anular</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Anular venta</DialogTitle>
          <DialogDescription>El stock de los artículos volverá al inventario de la sucursal. Esta acción no se puede deshacer.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Field label="Motivo de la anulación" error={errors.motivo?.message}>
            <Input {...register("motivo")} maxLength={200} />
          </Field>
          <Button type="submit" variant="destructive" disabled={pending} className="w-full">
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} Confirmar anulación
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
