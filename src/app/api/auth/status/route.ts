import { NextResponse } from "next/server";
import { createServerAuthClient } from "@/lib/supabase/server";

/** Tiny endpoint so the header can show "Account" vs "Log in" without
 *  making every page in the app dynamic — see AccountLink.tsx for why this
 *  has to be a client-side fetch rather than a cookies() read in a Server
 *  Component that's part of the shared layout. */
export async function GET() {
  const supabase = await createServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return NextResponse.json({ loggedIn: Boolean(user) });
}
