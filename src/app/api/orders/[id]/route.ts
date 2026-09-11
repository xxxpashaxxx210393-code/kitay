import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";

const finiteNumber = (value: unknown, fallback = 0) => {
  if (value === undefined || value === null || value === "") return fallback;
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
};

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const orderId = parseInt(id, 10);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json({ success: false, error: "Некорректный ID" }, { status: 400 });
    }

    const existing = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!existing.length) {
      return NextResponse.json({ success: false, error: "Товар не найден" }, { status: 404 });
    }

    const current = existing[0];
    const patch: Record<string, any> = {};
    const textFields = [
      "name", "imageUrl", "itemUrl", "forWhom", "trackNumber", "status",
      "plannedDate", "receivedDate", "notes",
    ] as const;

    for (const field of textFields) {
      if (body[field] !== undefined) {
        patch[field] = body[field] === "" ? null : String(body[field]);
      }
    }

    if (body.quantity !== undefined) {
      patch.quantity = Math.max(1, Math.round(finiteNumber(body.quantity, current.quantity)));
    }
    if (body.priceCny !== undefined) {
      patch.priceCny = Math.max(0, finiteNumber(body.priceCny, Number(current.priceCny)));
    }
    if (body.shippingChinaCny !== undefined) {
      patch.shippingChinaCny = Math.max(0, finiteNumber(body.shippingChinaCny, Number(current.shippingChinaCny || 0)));
    }
    if (body.shippingChinaUsd !== undefined) {
      patch.shippingChinaUsd = Math.max(0, finiteNumber(body.shippingChinaUsd, Number(current.shippingChinaUsd || 0)));
    }
    if (body.shippingBelarusByn !== undefined) {
      patch.shippingBelarusByn = Math.max(0, finiteNumber(body.shippingBelarusByn, Number(current.shippingBelarusByn || 0)));
    }
    if (body.shippingUsdByn !== undefined) {
      patch.shippingUsdByn = Math.max(0, finiteNumber(body.shippingUsdByn, Number(current.shippingUsdByn || 0)));
    }
    if (body.rateCnyByn !== undefined) {
      patch.rateCnyByn = Math.max(0, finiteNumber(body.rateCnyByn, Number(current.rateCnyByn)));
    }
    if (body.weight !== undefined) {
      patch.weight = Math.max(0, finiteNumber(body.weight, Number(current.weight || 0)));
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ success: true, data: current }, { headers: { "Cache-Control": "no-store" } });
    }

    await db.update(orders).set(patch).where(eq(orders.id, orderId));
    const updated = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);

    return NextResponse.json(
      { success: true, data: updated[0] },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    console.error("Error in PUT /api/orders/[id]:", error);
    const message = error instanceof Error ? error.message : "Ошибка сохранения товара";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderId = parseInt(id, 10);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json({ success: false, error: "Некорректный ID" }, { status: 400 });
    }

    const deleted = await db.delete(orders).where(eq(orders.id, orderId)).returning();
    if (!deleted.length) {
      return NextResponse.json({ success: false, error: "Товар не найден" }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Товар успешно удален" });
  } catch (error: unknown) {
    console.error("Error in DELETE /api/orders/[id]:", error);
    const message = error instanceof Error ? error.message : "Ошибка удаления";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
