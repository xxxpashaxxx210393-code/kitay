import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";

const NUMBER_FIELDS = new Set(["quantity", "priceCny", "weight", "shippingBelarusByn", "shippingChinaUsd", "rateCnyByn"]);
const TEXT_FIELDS = new Set(["name", "forWhom", "trackNumber", "status", "itemUrl", "imageUrl", "notes"]);

export async function PUT(req: Request) {
  try {
    const { id, field, value } = await req.json();
    const orderId = Number(id);
    if (!Number.isInteger(orderId) || orderId <= 0) return NextResponse.json({ success: false, error: "Некорректный ID" }, { status: 400 });
    if (!NUMBER_FIELDS.has(field) && !TEXT_FIELDS.has(field)) return NextResponse.json({ success: false, error: "Это поле нельзя редактировать" }, { status: 400 });
    const normalized = NUMBER_FIELDS.has(field) ? (Number(value) || 0) : String(value ?? "");
    const updated = await db.update(orders).set({ [field]: normalized } as any).where(eq(orders.id, orderId)).returning();
    if (!updated.length) return NextResponse.json({ success: false, error: "Товар не найден" }, { status: 404 });
    return NextResponse.json({ success: true, data: updated[0] });
  } catch (error: any) {
    console.error("Inline order update error", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
