import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const projectId = Number(url.searchParams.get("projectId") || 1);

    // IMPORTANT: reading orders must never try to create/alter database tables.
    // Production databases can have restricted DDL permissions. A failed schema
    // check previously made the whole order list look empty on the phone.
    let list;
    try {
      list = await db
        .select()
        .from(orders)
        .where(eq(orders.projectId, projectId))
        .orderBy(desc(orders.id));
    } catch (schemaError: any) {
      // Compatibility with an older orders table that has no project_id column.
      // Return the existing data instead of hiding it behind a 500 error.
      console.error("Project-filtered orders query failed, using legacy read:", schemaError);
      const raw = await db.execute(sql`SELECT * FROM "orders" ORDER BY "id" DESC`);
      list = (raw as any).rows.map((r: any) => ({
        id: Number(r.id),
        projectId: Number(r.project_id ?? 1),
        name: r.name,
        imageUrl: r.image_url ?? null,
        itemUrl: r.item_url ?? null,
        forWhom: r.for_whom ?? null,
        trackNumber: r.track_number ?? null,
        status: r.status ?? "В пути на склад Китая",
        quantity: Number(r.quantity ?? 1),
        priceCny: Number(r.price_cny ?? 0),
        shippingChinaCny: Number(r.shipping_china_cny ?? 0),
        shippingChinaUsd: Number(r.shipping_china_usd ?? 0),
        shippingBelarusByn: Number(r.shipping_belarus_byn ?? 0),
        rateCnyByn: Number(r.rate_cny_byn ?? 0.48),
        weight: Number(r.weight ?? 0),
        plannedDate: r.planned_date ?? null,
        receivedDate: r.received_date ?? null,
        notes: r.notes ?? null,
        createdAt: r.created_at ?? null,
      })).filter((r: any) => r.projectId === projectId);
    }

    return NextResponse.json({ success: true, data: list });
  } catch (error: any) {
    console.error("Error in GET /api/orders:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      projectId,
      name,
      imageUrl,
      itemUrl,
      forWhom,
      trackNumber,
      status,
      quantity,
      priceCny,
      shippingChinaCny,
      shippingBelarusByn,
      rateCnyByn,
      weight,
      plannedDate,
      receivedDate,
      notes
    } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: "Название товара обязательно" }, { status: 400 });
    }

    const newOrder = await db.insert(orders).values({
      projectId: projectId !== undefined ? Number(projectId) : 1,
      name,
      imageUrl: imageUrl || null,
      itemUrl: itemUrl || null,
      forWhom: forWhom || "Себе",
      trackNumber: trackNumber || null,
      status: status || "В пути на склад Китая",
      quantity: quantity !== undefined ? Number(quantity) : 1,
      priceCny: priceCny !== undefined ? Number(priceCny) : 0,
      shippingChinaCny: shippingChinaCny !== undefined ? Number(shippingChinaCny) : 0,
      shippingBelarusByn: shippingBelarusByn !== undefined ? Number(shippingBelarusByn) : 0,
      rateCnyByn: rateCnyByn !== undefined ? Number(rateCnyByn) : 0.48,
      weight: weight !== undefined ? Number(weight) : 0,
      plannedDate: plannedDate || null,
      receivedDate: receivedDate || null,
      notes: notes || null,
    }).returning();

    return NextResponse.json({ success: true, data: newOrder[0] });
  } catch (error: any) {
    console.error("Error in POST /api/orders:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const projectId = Number(url.searchParams.get("projectId") || 1);
    await db.delete(orders).where(eq(orders.projectId, projectId));
    return NextResponse.json({ success: true, message: "Все товары успешно удалены из базы" });
  } catch (error: any) {
    console.error("Error in DELETE /api/orders:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
