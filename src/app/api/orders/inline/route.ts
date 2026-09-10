import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";

const NUMBER_FIELDS = ["quantity","priceCny","weight","shippingBelarusByn","shippingChinaUsd","shippingUsdByn","rateCnyByn"] as const;
const TEXT_FIELDS = ["name","forWhom","trackNumber","status","itemUrl","imageUrl","notes"] as const;

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const orderId = Number(body?.id);
    const field = String(body?.field || "");
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json({success:false,error:"Некорректный ID"},{status:400});
    }

    if ((NUMBER_FIELDS as readonly string[]).includes(field)) {
      const n = Number(String(body?.value ?? "").replace(",", "."));
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json({success:false,error:"Некорректное число"},{status:400});
      }

      let updated: any[] = [];
      switch (field) {
        case "quantity": updated = await db.update(orders).set({quantity: Math.max(1, Math.round(n))}).where(eq(orders.id,orderId)).returning(); break;
        case "priceCny": updated = await db.update(orders).set({priceCny: n}).where(eq(orders.id,orderId)).returning(); break;
        case "weight": updated = await db.update(orders).set({weight: n}).where(eq(orders.id,orderId)).returning(); break;
        case "shippingBelarusByn": updated = await db.update(orders).set({shippingBelarusByn: n}).where(eq(orders.id,orderId)).returning(); break;
        case "shippingChinaUsd": updated = await db.update(orders).set({shippingChinaUsd: n}).where(eq(orders.id,orderId)).returning(); break;
        case "shippingUsdByn": updated = await db.update(orders).set({shippingUsdByn: n}).where(eq(orders.id,orderId)).returning(); break;
        case "rateCnyByn": updated = await db.update(orders).set({rateCnyByn: n}).where(eq(orders.id,orderId)).returning(); break;
      }
      if (!updated.length) return NextResponse.json({success:false,error:"Товар не найден"},{status:404});
      return NextResponse.json({success:true,data:updated[0]},{headers:{"Cache-Control":"no-store"}});
    }

    if ((TEXT_FIELDS as readonly string[]).includes(field)) {
      const value = String(body?.value ?? "");
      let updated: any[] = [];
      switch (field) {
        case "name": updated = await db.update(orders).set({name:value}).where(eq(orders.id,orderId)).returning(); break;
        case "forWhom": updated = await db.update(orders).set({forWhom:value}).where(eq(orders.id,orderId)).returning(); break;
        case "trackNumber": updated = await db.update(orders).set({trackNumber:value}).where(eq(orders.id,orderId)).returning(); break;
        case "status": updated = await db.update(orders).set({status:value}).where(eq(orders.id,orderId)).returning(); break;
        case "itemUrl": updated = await db.update(orders).set({itemUrl:value}).where(eq(orders.id,orderId)).returning(); break;
        case "imageUrl": updated = await db.update(orders).set({imageUrl:value}).where(eq(orders.id,orderId)).returning(); break;
        case "notes": updated = await db.update(orders).set({notes:value}).where(eq(orders.id,orderId)).returning(); break;
      }
      if (!updated.length) return NextResponse.json({success:false,error:"Товар не найден"},{status:404});
      return NextResponse.json({success:true,data:updated[0]},{headers:{"Cache-Control":"no-store"}});
    }

    return NextResponse.json({success:false,error:"Это поле нельзя редактировать"},{status:400});
  } catch (error: any) {
    console.error("Inline order update error", error);
    return NextResponse.json({success:false,error:error?.message || "Ошибка базы данных"},{status:500});
  }
}
