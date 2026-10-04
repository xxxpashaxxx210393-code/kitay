import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders, projects } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const orderIds = Array.isArray(body.orderIds)
      ? body.orderIds.map(Number).filter((id: number) => Number.isFinite(id) && id > 0)
      : [];
    const fromProjectId = Number(body.fromProjectId);
    const toProjectId = Number(body.toProjectId);

    if (!orderIds.length) {
      return NextResponse.json({ success: false, error: "Не выбраны товары" }, { status: 400 });
    }
    if (!fromProjectId || !toProjectId || fromProjectId === toProjectId) {
      return NextResponse.json({ success: false, error: "Выберите другой проект" }, { status: 400 });
    }

    const target = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, toProjectId));
    if (!target.length) {
      return NextResponse.json({ success: false, error: "Проект назначения не найден" }, { status: 404 });
    }

    const result = await db
      .update(orders)
      .set({ projectId: toProjectId })
      .where(
        inArray(orders.id, orderIds)
      )
      .returning({ id: orders.id });

    return NextResponse.json({
      success: true,
      movedCount: result.length,
      ids: result.map((row) => row.id),
    });
  } catch (error: any) {
    console.error("POST /api/orders/move:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Не удалось перенести товары" },
      { status: 500 }
    );
  }
}
