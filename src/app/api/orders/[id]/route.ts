import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const orderId = parseInt(id);

    if (isNaN(orderId)) {
      return NextResponse.json({ success: false, error: "Некорректный ID" }, { status: 400 });
    }

    const {
      name,
      imageUrl,
      itemUrl,
      forWhom,
      trackNumber,
      status,
      quantity,
      priceCny,
      shippingChinaCny,
      shippingChinaUsd,
      shippingBelarusByn,
      rateCnyByn,
      weight,
      plannedDate,
      receivedDate,
      notes
    } = body;

    const updated = await db
      .update(orders)
      .set({
        name,
        imageUrl,
        itemUrl,
        forWhom,
        trackNumber,
        status,
        quantity: quantity !== undefined ? Number(quantity) : undefined,
        priceCny: priceCny !== undefined ? Number(priceCny) : undefined,
        shippingChinaCny: shippingChinaCny !== undefined ? Number(shippingChinaCny) : undefined,
        shippingChinaUsd: shippingChinaUsd !== undefined ? Number(shippingChinaUsd) : undefined,
        shippingBelarusByn: shippingBelarusByn !== undefined ? Number(shippingBelarusByn) : undefined,
        rateCnyByn: rateCnyByn !== undefined ? Number(rateCnyByn) : undefined,
        weight: weight !== undefined ? Number(weight) : undefined,
        plannedDate,
        receivedDate,
        notes,
      })
      .where(eq(orders.id, orderId))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ success: false, error: "Товар не найден" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated[0] });
  } catch (error: any) {
    console.error("Error in PUT /api/orders/[id]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderId = parseInt(id);

    if (isNaN(orderId)) {
      return NextResponse.json({ success: false, error: "Некорректный ID" }, { status: 400 });
    }

    const deleted = await db
      .delete(orders)
      .where(eq(orders.id, orderId))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ success: false, error: "Товар не найден" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Товар успешно удален" });
  } catch (error: any) {
    console.error("Error in DELETE /api/orders/[id]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
