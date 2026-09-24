import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders, projects } from "@/db/schema";
import { desc, eq, or, ilike } from "drizzle-orm";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() || "";
  if (q.length < 2) {
    return NextResponse.json({ success: true, data: [] });
  }

  try {
    const pattern = `%${q}%`;
    const rows = await db
      .select({
        id: orders.id,
        projectId: orders.projectId,
        name: orders.name,
        forWhom: orders.forWhom,
        trackNumber: orders.trackNumber,
        status: orders.status,
        imageUrl: orders.imageUrl,
        projectName: projects.name,
      })
      .from(orders)
      .leftJoin(projects, eq(orders.projectId, projects.id))
      .where(
        or(
          ilike(orders.name, pattern),
          ilike(orders.trackNumber, pattern),
          ilike(orders.forWhom, pattern),
          ilike(orders.notes, pattern)
        )
      )
      .orderBy(desc(orders.id))
      .limit(30);

    return NextResponse.json({ success: true, data: rows }, {
      headers: { "Cache-Control": "no-store, max-age=0" }
    });
  } catch (error: any) {
    console.error("GET /api/search:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Ошибка глобального поиска" },
      { status: 500 }
    );
  }
}
