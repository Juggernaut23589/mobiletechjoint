"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/actions/account";

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100";
const labelClass = "mb-1 block text-sm font-medium text-neutral-900";

export function ProfileForm({
  defaultFullName,
  defaultPhone,
  defaultAge,
  defaultGender,
  defaultAddress,
}: {
  defaultFullName: string;
  defaultPhone: string;
  defaultAge: number | null;
  defaultGender: string;
  defaultAddress: string;
}) {
  const [state, formAction, pending] = useActionState(updateProfile, {});

  return (
    <form action={formAction} className="flex flex-col gap-3.5">
      <div>
        <label htmlFor="fullName" className={labelClass}>
          Full name
        </label>
        <input id="fullName" name="fullName" required defaultValue={defaultFullName} className={inputClass} />
      </div>

      <div>
        <label htmlFor="phone" className={labelClass}>
          Phone number
        </label>
        <input id="phone" name="phone" type="tel" defaultValue={defaultPhone} className={inputClass} />
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        <div>
          <label htmlFor="age" className={labelClass}>
            Age
          </label>
          <input
            id="age"
            name="age"
            type="number"
            min={13}
            max={120}
            defaultValue={defaultAge ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="gender" className={labelClass}>
            Gender
          </label>
          <select id="gender" name="gender" defaultValue={defaultGender} className={inputClass}>
            <option value="">Prefer not to say</option>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="address" className={labelClass}>
          Address
        </label>
        <textarea
          id="address"
          name="address"
          rows={3}
          placeholder="House number, street, area, city"
          defaultValue={defaultAddress}
          className={inputClass}
        />
      </div>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state.notice && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{state.notice}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 w-full rounded-md bg-accent-500 px-6 py-2.5 text-sm font-semibold text-brand-900 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
