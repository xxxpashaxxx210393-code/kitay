import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";

const NUMBER_FIELDS = ["quantity","priceCny","weight","shippingBelarusByn","shippingChinaUsd","rateCnyByn"] as const;
const TEXT_FIELDS = ["name","forWhom","trackNumber","status","itemUrl","imageUrl","notes"] as const;

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const orderId = Number(body?.id);
    const field = String(body?.field || "");
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json({success:false,error:"Некорректный ID"},{status:400});
    }

    let patch: Record<string, unknown>;
    if ((NUMBER_FIELDS as readonly string[]).includes(field)) {
      const n = Number(String(body?.value ?? "").replace(",", "."));
      if (!Number.isFinite(n)) return NextResponse.json({success:false,error:"Некорректное число"},{status:400});
      patch = {[field]: n};
    } else if ((TEXT_FIELDS as readonly string[]).includes(field)) {
      patch = {[field]: String(body?.value ?? "")};
    } else {
      return NextResponse.json({success:false,error:"Это поле нельзя редактировать"},{status:400});
    }

    let updated: any[] = [];
    switch (field) {
      case "quantity": updated = await db.update(orders).set({quantity: patch.quantity as number}).where(eq(orders.id,orderId)).returning(); break;
      case "priceCny": updated = await db.update(orders).set({priceCny: patch.priceCny as number}).where(eq(orders.id,orderId)).returning(); break;
      case "weight": updated = await db.update(orders).set({weight: patch.weight as number}).where(eq(orders.id,orderId)).returning(); break;
      case "shippingBelarusByn": updated = await db.update(orders).set({shippingBelarusByn: patch.shippingBelarusByn as number}).where(eq(orders.id,orderId)).returning(); break;
      case "shippingChinaUsd": updated = await db.update(orders).set({shippingChinaUsd: patch.shippingChinaUsd as number}).where(eq(orders.id,orderId)).returning(); break;
      case "rateCnyByn": updated = await db.update(orders).set({rateCnyByn: patch.rateCnyByn as number}).where(eq(orders.id,orderId)).returning(); break;
      case "name": updated = await db.update(orders).set({name: patch.name as string}).where(eq(orders.id,orderId)).returning(); break;
      case "forWhom": updated = await db.update(orders).set({forWhom: patch.forWhom as string}).where(eq(orders.id,orderId)).returning(); break;
      case "trackNumber": updated = await db.update(orders).set({trackNumber: patch.trackNumber as string}).where(eq(orders.id,orderId)).returning(); break;
      case "status": updated = await db.update(orders).set({status: patch.status as string}).where(eq(orders.id,orderId)).returning(); break;
      case "itemUrl": updated = await db.update(orders).set({itemUrl: patch.itemUrl as string}).where(eq(orders.id,orderId)).returning(); break;
      case "imageUrl": updated = await db.update(orders).set({imageUrl: patch.imageUrl as string}).where(eq(orders.id,orderId)).returning(); break;
      case "notes": updated = await db.update(orders).set({notes: patch.notes as string}).where(eq(orders.id,orderId)).returning(); break;
    }

    if (!updated.length) return NextResponse.json({success:false,error:"Товар не найден"},{status:404});
    return NextResponse.json({success:true,data:updated[0]},{headers:{"Cache-Control":"no-store"}});
  } catch (error: any) {
    console.error("Inline order update error", error);
    return NextResponse.json({success:false,error:error?.message || "Ошибка базы данных"},{status:500});
  }
}
