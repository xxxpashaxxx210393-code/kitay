import { NextResponse } from "next/server";

const LEGACY = "https://kitay-i88toy6uv-xxxpashaxxx.vercel.app/api/orders";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = Number(url.searchParams.get("from") || 1);
  const to = Number(url.searchParams.get("to") || 69);
  const includeImages = url.searchParams.get("images") !== "0";
  const res = await fetch(LEGACY + (includeImages ? "" : "?includeImages=0"), { cache: "no-store" });
  if (!res.ok) return NextResponse.json({ ok: false, status: res.status }, { status: 502 });
  const json = await res.json();
  const data = (json.data || []).filter((x: any) => Number(x.id) >= from && Number(x.id) <= to);
  return NextResponse.json({ ok: true, sourceCount: (json.data || []).length, from, to, data });
}