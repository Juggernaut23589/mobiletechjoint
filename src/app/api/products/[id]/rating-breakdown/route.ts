import { NextResponse } from "next/server";
import { getRatingBreakdown } from "@/lib/reviews";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const breakdown = await getRatingBreakdown(id);
  return NextResponse.json({ breakdown });
}
