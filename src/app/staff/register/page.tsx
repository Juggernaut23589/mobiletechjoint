import Link from "next/link";
import { decodeStaffInvite } from "@/lib/staff-auth";
import { StaffRegisterForm } from "@/components/staff/StaffRegisterForm";

export const dynamic = "force-dynamic";

export default async function StaffRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;
  const decoded = invite ? await decodeStaffInvite(invite) : null;

  if (!invite || !decoded) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center px-4 py-8 text-center">
        <h1 className="mb-2 text-xl font-bold text-brand-900">Invitation required</h1>
        <p className="mb-6 text-sm text-neutral-500">
          {invite
            ? "This invite link is invalid or has expired. Ask an admin to send you a new one."
            : "Staff accounts are by invitation only. Ask an admin to send you an invite link."}
        </p>
        <Link href="/staff/login" className="text-sm font-medium text-brand-600 hover:underline">
          Go to staff login
        </Link>
      </div>
    );
  }

  return <StaffRegisterForm invite={invite} email={decoded.email} />;
}
