import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects, orders } from "@/db/schema";
import { asc, eq, sql } from "drizzle-orm";

async function ensureProjects() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS "projects" ("id" serial PRIMARY KEY, "name" varchar(255) NOT NULL, "created_at" timestamp NOT NULL DEFAULT now());`);
  await db.execute(sql`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "project_id" integer NOT NULL DEFAULT 1;`);
  const rows = await db.select().from(projects).orderBy(asc(projects.id));
  if (rows.length === 0) {
    const created = await db.insert(projects).values({ name: "Китай — основной проект" }).returning();
    return created;
  }
  return rows;
}

export async function GET() {
  try { return NextResponse.json({ success: true, data: await ensureProjects() }); }
  catch (e:any) { return NextResponse.json({success:false,error:e.message},{status:500}); }
}

export async function POST(req: Request) {
  try {
    await ensureProjects();
    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({success:false,error:"Название проекта обязательно"},{status:400});
    const created = await db.insert(projects).values({name:name.trim()}).returning();
    return NextResponse.json({success:true,data:created[0]});
  } catch(e:any) { return NextResponse.json({success:false,error:e.message},{status:500}); }
}

export async function PUT(req: Request) {
  try {
    const { id, name } = await req.json();
    if (!id || !name?.trim()) return NextResponse.json({success:false,error:"Неверные данные"},{status:400});
    const updated = await db.update(projects).set({name:name.trim()}).where(eq(projects.id,Number(id))).returning();
    return NextResponse.json({success:true,data:updated[0]});
  } catch(e:any) { return NextResponse.json({success:false,error:e.message},{status:500}); }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    const pid=Number(id);
    if (!pid) return NextResponse.json({success:false,error:"Неверный проект"},{status:400});
    const all=await db.select().from(projects).orderBy(asc(projects.id));
    if (all.length<=1) return NextResponse.json({success:false,error:"Нельзя удалить последний проект"},{status:400});
    await db.delete(orders).where(eq(orders.projectId,pid));
    await db.delete(projects).where(eq(projects.id,pid));
    return NextResponse.json({success:true});
  } catch(e:any) { return NextResponse.json({success:false,error:e.message},{status:500}); }
}
