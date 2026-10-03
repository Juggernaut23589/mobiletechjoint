"use client";

import { useState } from "react";
import { SupplierForm } from "@/components/staff/SupplierForm";
import { setSupplierActive } from "@/app/actions/staff-purchasing";
import type { Supplier } from "@/types/database";

export function SupplierRow({
  supplier,
  stats,
}: {
  supplier: Supplier;
  stats: { openOrders: number; outstanding: string | null };
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium ${supplier.is_active ? "" : "text-neutral-400 line-through"}`}>
            {supplier.name}
          </p>
          <p className="text-xs text-neutral-500">
            {supplier.kind === "import" ? "Importer" : "Local"} · {supplier.currency}
            {supplier.contact_name && ` · ${supplier.contact_name}`}
            {supplier.phone && ` · ${supplier.phone}`}
          </p>
        </div>
        <div className="text-right text-xs text-neutral-500">
          {stats.openOrders > 0 && <p>{stats.openOrders} open order(s)</p>}
          {stats.outstanding && <p className="font-semibold text-amber-700">Owed: {stats.outstanding}</p>}
        </div>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium hover:bg-neutral-50"
        >
          {editing ? "Close" : "Edit"}
        </button>
        <form action={setSupplierActive}>
          <input type="hidden" name="id" value={supplier.id} />
          <input type="hidden" name="isActive" value={String(!supplier.is_active)} />
          <button type="submit" className="text-xs text-neutral-400 hover:text-red-600">
            {supplier.is_active ? "Deactivate" : "Reactivate"}
          </button>
        </form>
      </div>
      {editing && (
        <div className="mt-3 rounded-md bg-neutral-50 p-3">
          <SupplierForm supplier={supplier} onDone={() => setEditing(false)} />
        </div>
      )}
    </div>
  );
}
