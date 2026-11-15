import * as React from "react";
import { cn } from "@/lib/utils";

export const Table = ({ className, ...p }: React.HTMLAttributes<HTMLTableElement>) => (
  <div className="w-full overflow-auto rounded-xl border">
    <table className={cn("w-full caption-bottom text-sm", className)} {...p} />
  </div>
);
export const TableHeader = (p: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className="bg-secondary/60 [&_tr]:border-b" {...p} />
);
export const TableBody = (p: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className="[&_tr:last-child]:border-0" {...p} />
);
export const TableRow = ({ className, ...p }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn("border-b transition-colors hover:bg-accent/50", className)} {...p} />
);
export const TableHead = ({ className, ...p }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    className={cn("h-11 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-secondary-foreground", className)}
    {...p}
  />
);
export const TableCell = ({ className, ...p }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn("px-4 py-3 align-middle", className)} {...p} />
);
