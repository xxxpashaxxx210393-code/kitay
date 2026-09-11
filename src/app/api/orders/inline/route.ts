import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";

const NUMBER_FIELDS = [
  "quantity",
  "priceCny",
  "weight",
  "shippingBelarusByn",
  "shippingChinaUsd",
  "shippingUsdByn",
  "rateCnyByn",
] as const;

const TEXT_FIELDS = [
  "name",
  "forWhom",
  "trackNumber",
  "status",
  "itemUrl",
  "imageUrl",
  "notes",
] as const;

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const orderId = Number(body?.id);
    const field = String(body?.field || "");

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json({ success: false, error: "Некорректный ID" }, { status: 400 });
    }

    if ((NUMBER_FIELDS as readonly string[]).includes(field)) {
      const n = Number(String(body?.value ?? "").replace(",", "."));
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json({ success: false, error: "Некорректное число" }, { status: 400 });
      }

      const value = field === "quantity" ? Math.max(1, Math.round(n)) : n;

      // Do not use RETURNING * here. The UI only needs confirmation and the
      // calculated values are intentionally produced on the client from state.
      // This also keeps inline editing independent from any extra DB columns.
      switch (field) {
        case "quantity":
          await db.update(orders).set({ quantity: value }).where(eq(orders.id, orderId));
          break;
        case "priceCny":
          await db.update(orders).set({ priceCny: value }).where(eq(orders.id, orderId));
          break;
        case "weight":
          await db.update(orders).set({ weight: value }).where(eq(orders.id, orderId));
          break;
        case "shippingBelarusByn":
          await db.update(orders).set({ shippingBelarusByn: value }).where(eq(orders.id, orderId));
          break;
        case "shippingChinaUsd":
          await db.update(orders).set({ shippingChinaUsd: value }).where(eq(orders.id, orderId));
          break;
        case "shippingUsdByn":
          await db.update(orders).set({ shippingUsdByn: value }).where(eq(orders.id, orderId));
          break;
        case "rateCnyByn":
          await db.update(orders).set({ rateCnyByn: value }).where(eq(orders.id, orderId));
          break;
      }

      return NextResponse.json(
        { success: true, data: { id: orderId, [field]: value } },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    if ((TEXT_FIELDS as readonly string[]).includes(field)) {
      const value = String(body?.value ?? "");

      switch (field) {
        case "name":
          await db.update(orders).set({ name: value }).where(eq(orders.id, orderId));
          break;
        case "forWhom":
          await db.update(orders).set({ forWhom: value }).where(eq(orders.id, orderId));
          break;
        case "trackNumber":
          await db.update(orders).set({ trackNumber: value }).where(eq(orders.id, orderId));
          break;
        case "status":
          await db.update(orders).set({ status: value }).where(eq(orders.id, orderId));
          break;
        case "itemUrl":
          await db.update(orders).set({ itemUrl: value }).where(eq(orders.id, orderId));
          break;
        case "imageUrl":
          await db.update(orders).set({ imageUrl: value }).where(eq(orders.id, orderId));
          break;
        case "notes":
          await db.update(orders).set({ notes: value }).where(eq(orders.id, orderId));
          break;
      }

      return NextResponse.json(
        { success: true, data: { id: orderId, [field]: value } },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { success: false, error: "Это поле нельзя редактировать" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Inline order update error", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Ошибка базы данных" },
      { status: 500 }
    );
  }
}
