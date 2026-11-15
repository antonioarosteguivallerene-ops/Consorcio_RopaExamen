"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { actualizarPrecio } from "@/actions/inventario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function EditarPrecio({ id, precio }: { id: string; precio: number }) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(String(precio));
  const [pending, start] = useTransition();

  if (!editando) {
    return (
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditando(true)} aria-label="Editar precio">
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    );
  }

  const guardar = () =>
    start(async () => {
      const res = await actualizarPrecio(id, valor);
      if (res.ok) { toast.success(res.message); setEditando(false); }
      else toast.error(res.error);
    });

  return (
    <span className="flex items-center gap-1">
      <Input className="h-8 w-24" type="number" step="0.01" min="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={guardar} disabled={pending} aria-label="Guardar">
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
      </Button>
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditando(false); setValor(String(precio)); }} aria-label="Cancelar">
        <X className="h-3.5 w-3.5" />
      </Button>
    </span>
  );
}
