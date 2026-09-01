import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects, orders } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

const DEFAULT_PROJECT = { id: 1, name: "Китай — основной проект", createdAt: new Date(0).toISOString() };

export async function GET() {
  try {
    const rows = await db.select().from(projects).orderBy(asc(projects.id));
    if (rows.length > 0) return NextResponse.json({ success: true, data: rows });
    return NextResponse.json({ success: true, data: [DEFAULT_PROJECT] });
  } catch (e: any) {
    console.error("GET /api/projects:", e);
    return NextResponse.json({ success: true, data: [DEFAULT_PROJECT], fallback: true });
  }
}

export async function POST(req: Request) {
  try {
    const { ensureDatabase } = await import("@/db");
    await ensureDatabase();
    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ success: false, error: "Название проекта обязательно" }, { status: 400 });
    const created = await db.insert(projects).values({ name: name.trim() }).returning();
    return NextResponse.json({ success: true, data: created[0] });
  } catch (e: any) {
    console.error("POST /api/projects:", e);
    return NextResponse.json({ success: false, error: "Не удалось создать проект" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { ensureDatabase } = await import("@/db");
    await ensureDatabase();
    const { id, name } = await req.json();
    if (!id || !name?.trim()) return NextResponse.json({ success: false, error: "Неверные данные" }, { status: 400 });
    const updated = await db.update(projects).set({ name: name.trim() }).where(eq(projects.id, Number(id))).returning();
    return NextResponse.json({ success: true, data: updated[0] });
  } catch (e: any) {
    console.error("PUT /api/projects:", e);
    return NextResponse.json({ success: false, error: "Не удалось изменить проект" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { ensureDatabase } = await import("@/db");
    await ensureDatabase();
    const { id } = await req.json();
    const pid = Number(id);
    if (!pid) return NextResponse.json({ success: false, error: "Неверный проект" }, { status: 400 });
    const all = await db.select().from(projects).orderBy(asc(projects.id));
    if (all.length <= 1) return NextResponse.json({ success: false, error: "Нельзя удалить последний проект" }, { status: 400 });
    await db.delete(orders).where(eq(orders.projectId, pid));
    await db.delete(projects).where(eq(projects.id, pid));
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("DELETE /api/projects:", e);
    return NextResponse.json({ success: false, error: "Не удалось удалить проект" }, { status: 500 });
  }
}
