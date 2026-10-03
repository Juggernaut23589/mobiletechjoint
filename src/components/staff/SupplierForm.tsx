"use client";

import { useActionState } from "react";
import { saveSupplier } from "@/app/actions/staff-purchasing";
import type { Supplier } from "@/types/database";

const input = "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm";

export function SupplierForm({ supplier, onDone }: { supplier?: Supplier; onDone?: () => void }) {
  const [state, formAction, pending] = useActionState(saveSupplier, {});

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      {supplier && <input type="hidden" name="id" value={supplier.id} />}
      <label className="text-xs text-neutral-500 sm:col-span-2">
        Name
        <input name="name" required defaultValue={supplier?.name} className={input} />
      </label>
      <label className="text-xs text-neutral-500">
        Type
        <select name="kind" defaultValue={supplier?.kind ?? "local"} className={input}>
          <option value="local">Local distributor</option>
          <option value="import">Importer / overseas</option>
        </select>
      </label>
      <label className="text-xs text-neutral-500">
        Usual currency
        <select name="currency" defaultValue={supplier?.currency ?? "NGN"} className={input}>
          <option value="NGN">Naira (₦)</option>
          <option value="USD">US dollar ($)</option>
        </select>
      </label>
      <label className="text-xs text-neutral-500">
        Contact person
        <input name="contactName" defaultValue={supplier?.contact_name ?? ""} className={input} />
      </label>
      <label className="text-xs text-neutral-500">
        Phone / WhatsApp
        <input name="phone" defaultValue={supplier?.phone ?? ""} className={input} />
      </label>
      <label className="text-xs text-neutral-500">
        Email
        <input name="email" type="email" defaultValue={supplier?.email ?? ""} className={input} />
      </label>
      <label className="text-xs text-neutral-500">
        Address / location
        <input name="address" defaultValue={supplier?.address ?? ""} className={input} />
      </label>
      <label className="text-xs text-neutral-500 sm:col-span-2">
        Notes
        <textarea name="notes" rows={2} defaultValue={supplier?.notes ?? ""} className={input} />
      </label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-glow disabled:opacity-50"
        >
          {pending ? "Saving…" : supplier ? "Save changes" : "Add supplier"}
        </button>
        {onDone && (
          <button type="button" onClick={onDone} className="text-sm text-neutral-500">
            Close
          </button>
        )}
        {state.error && <span className="text-sm text-red-600">{state.error}</span>}
        {state.notice && <span className="text-sm text-green-700">{state.notice}</span>}
      </div>
    </form>
  );
}
