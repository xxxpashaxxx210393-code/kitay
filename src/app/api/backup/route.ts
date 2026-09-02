import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders, projects } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [projectRows, orderRows] = await Promise.all([
      db.select().from(projects).orderBy(desc(projects.id)),
      db.select().from(orders).orderBy(desc(orders.id)),
    ]);

    const payload = {
      format: "kitay-backup-v1",
      createdAt: new Date().toISOString(),
      warning: "Это резервная копия данных. Не удаляйте исходную базу.",
      projects: projectRows,
      orders: orderRows,
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="kitay-backup-${new Date().toISOString().slice(0,10)}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("Backup export failed:", error);
    return NextResponse.json({ success: false, error: error?.message || "Не удалось создать резервную копию" }, { status: 500 });
  }
}
