import { NextResponse } from "next/server";
import { createServerAuthClient, createServiceClient } from "@/lib/supabase/server";

/** Tiny endpoint so the header can show the avatar vs "Log in" without
 *  making every page in the app dynamic — see AccountLink.tsx for why this
 *  has to be a client-side fetch rather than a cookies() read in a Server
 *  Component that's part of the shared layout. */
export async function GET() {
  const supabase = await createServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ loggedIn: false });

  const { data: profile } = await createServiceClient()
    .from("customer_profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({ loggedIn: true, fullName: profile?.full_name ?? null });
}
