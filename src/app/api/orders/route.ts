import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";

function mapLegacyOrder(r: any) {
  return {
    id: Number(r.id), projectId: Number(r.project_id ?? 1), name: r.name,
    imageUrl: r.image_url ?? null, itemUrl: r.item_url ?? null, forWhom: r.for_whom ?? null,
    trackNumber: r.track_number ?? null, status: r.status ?? "В пути на склад Китая",
    quantity: Number(r.quantity ?? 1), priceCny: Number(r.price_cny ?? 0),
    shippingChinaCny: Number(r.shipping_china_cny ?? 0), shippingChinaUsd: Number(r.shipping_china_usd ?? 0),
    shippingBelarusByn: Number(r.shipping_belarus_byn ?? 0), rateCnyByn: Number(r.rate_cny_byn ?? 0.48),
    weight: Number(r.weight ?? 0), plannedDate: r.planned_date ?? null, receivedDate: r.received_date ?? null,
    notes: r.notes ?? null, createdAt: r.created_at ?? null,
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = Number(url.searchParams.get("projectId") || 1);
  try {
    const list = await db.select().from(orders).where(eq(orders.projectId, projectId)).orderBy(desc(orders.id));
    if (list.length === 0 && projectId === 1) {
      const raw = await db.execute(sql`SELECT * FROM "orders" ORDER BY "id" DESC`);
      return NextResponse.json({ success: true, data: (raw as any).rows.map(mapLegacyOrder), recovered: true });
    }
    return NextResponse.json({ success: true, data: list });
  } catch (error: any) {
    console.error("Error in GET /api/orders:", error);
    try {
      const raw = await db.execute(sql`SELECT * FROM "orders" ORDER BY "id" DESC`);
      const all = (raw as any).rows.map(mapLegacyOrder);
      return NextResponse.json({ success: true, data: projectId === 1 ? all : all.filter((r: any) => r.projectId === projectId), recovered: true });
    } catch (legacyError: any) {
      console.error("Legacy orders read failed:", legacyError);
      return NextResponse.json({ success: true, data: [], recovered: true, databaseUnavailable: true });
    }
  }
}

export async function POST(req: Request) {
  try {
    const { ensureDatabase } = await import("@/db");
    await ensureDatabase();
    const body = await req.json();
    const { projectId, name, imageUrl, itemUrl, forWhom, trackNumber, status, quantity, priceCny, shippingChinaCny, shippingChinaUsd, shippingBelarusByn, rateCnyByn, weight, plannedDate, receivedDate, notes } = body;
    if (!name) return NextResponse.json({ success: false, error: "Название товара обязательно" }, { status: 400 });
    const newOrder = await db.insert(orders).values({
      projectId: projectId !== undefined ? Number(projectId) : 1, name, imageUrl: imageUrl || null, itemUrl: itemUrl || null,
      forWhom: forWhom || "Себе", trackNumber: trackNumber || null, status: status || "В пути на склад Китая",
      quantity: quantity !== undefined ? Number(quantity) : 1, priceCny: priceCny !== undefined ? Number(priceCny) : 0,
      shippingChinaCny: shippingChinaCny !== undefined ? Number(shippingChinaCny) : 0,
      shippingChinaUsd: shippingChinaUsd !== undefined ? Number(shippingChinaUsd) : 0,
      shippingBelarusByn: shippingBelarusByn !== undefined ? Number(shippingBelarusByn) : 0,
      rateCnyByn: rateCnyByn !== undefined ? Number(rateCnyByn) : 0.48, weight: weight !== undefined ? Number(weight) : 0,
      plannedDate: plannedDate || null, receivedDate: receivedDate || null, notes: notes || null,
    }).returning();
    return NextResponse.json({ success: true, data: newOrder[0] });
  } catch (error: any) {
    console.error("Error in POST /api/orders:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { ensureDatabase } = await import("@/db");
    await ensureDatabase();
    const projectId = Number(new URL(req.url).searchParams.get("projectId") || 1);
    await db.delete(orders).where(eq(orders.projectId, projectId));
    return NextResponse.json({ success: true, message: "Все товары успешно удалены из базы" });
  } catch (error: any) {
    console.error("Error in DELETE /api/orders:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
