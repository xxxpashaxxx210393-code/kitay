import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = Number(url.searchParams.get("projectId") || 1);
  const includeImages = url.searchParams.get("includeImages") !== "0";

  try {
    const list = await db
      .select()
      .from(orders)
      .where(eq(orders.projectId, projectId))
      .orderBy(desc(orders.id));

    const data = includeImages
      ? list
      : list.map((order) => ({ ...order, imageUrl: null }));

    return NextResponse.json(
      { success: true, data },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error: any) {
    console.error("Error in GET /api/orders:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Не удалось загрузить товары" },
      { status: 500 }
    );
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
      shippingChinaUsd,
      shippingBelarusByn,
      shippingUsdByn,
      rateCnyByn,
      weight,
      plannedDate,
      receivedDate,
      notes,
    } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Название товара обязательно" },
        { status: 400 }
      );
    }

    const newOrder = await db
      .insert(orders)
      .values({
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
        shippingChinaUsd: shippingChinaUsd !== undefined ? Number(shippingChinaUsd) : 0,
        shippingBelarusByn: shippingBelarusByn !== undefined ? Number(shippingBelarusByn) : 0,
        shippingUsdByn: shippingUsdByn !== undefined ? Number(shippingUsdByn) : null,
        rateCnyByn: rateCnyByn !== undefined ? Number(rateCnyByn) : 0.48,
        weight: weight !== undefined ? Number(weight) : 0,
        plannedDate: plannedDate || null,
        receivedDate: receivedDate || null,
        notes: notes || null,
      })
      .returning();

    return NextResponse.json({ success: true, data: newOrder[0] });
  } catch (error: any) {
    console.error("Error in POST /api/orders:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Не удалось добавить товар" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const projectId = Number(new URL(req.url).searchParams.get("projectId") || 1);
    await db.delete(orders).where(eq(orders.projectId, projectId));
    return NextResponse.json({ success: true, message: "Все товары успешно удалены из базы" });
  } catch (error: any) {
    console.error("Error in DELETE /api/orders:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Не удалось удалить товары" },
      { status: 500 }
    );
  }
}
