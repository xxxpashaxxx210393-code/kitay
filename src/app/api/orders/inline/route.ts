import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";

const EDITABLE_FIELDS = new Set([
  "quantity",
  "priceCny",
  "weight",
  "shippingBelarusByn",
  "shippingChinaUsd",
  "shippingUsdByn",
  "rateCnyByn",
  "name",
  "forWhom",
  "trackNumber",
  "status",
  "itemUrl",
  "imageUrl",
  "notes",
]);

const COLUMN_BY_FIELD: Record<string, keyof typeof orders.$inferInsert> = {
  quantity: "quantity",
  priceCny: "priceCny",
  weight: "weight",
  shippingBelarusByn: "shippingBelarusByn",
  shippingChinaUsd: "shippingChinaUsd",
  shippingUsdByn: "shippingUsdByn",
  rateCnyByn: "rateCnyByn",
  name: "name",
  forWhom: "forWhom",
  trackNumber: "trackNumber",
  status: "status",
  itemUrl: "itemUrl",
  imageUrl: "imageUrl",
  notes: "notes",
};

const NUMBER_FIELDS = new Set([
  "quantity",
  "priceCny",
  "weight",
  "shippingBelarusByn",
  "shippingChinaUsd",
  "shippingUsdByn",
  "rateCnyByn",
]);

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const orderId = Number(body?.id);
    const field = String(body?.field || "");
    const column = COLUMN_BY_FIELD[field];

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return json({ success: false, error: "Некорректный ID товара" }, 400);
    }

    if (!column || !EDITABLE_FIELDS.has(field)) {
      return json({ success: false, error: "Это поле нельзя редактировать" }, 400);
    }

    let value: number | string;

    if (NUMBER_FIELDS.has(field)) {
      const parsed = Number(String(body?.value ?? "").replace(",", "."));
      if (!Number.isFinite(parsed) || parsed < 0) {
        return json({ success: false, error: "Некорректное числовое значение" }, 400);
      }
      value = field === "quantity" ? Math.max(1, Math.round(parsed)) : parsed;
    } else {
      value = String(body?.value ?? "");
      if (field === "name" && !value.trim()) {
        return json({ success: false, error: "Название товара не может быть пустым" }, 400);
      }
    }

    // Verify the actual persisted row instead of relying on driver-specific
    // UPDATE metadata such as rowCount. Return only the edited field so the
    // client keeps the rest of its calculated row intact.
    await db
      .update(orders)
      .set({ [column]: value } as Partial<typeof orders.$inferInsert>)
      .where(eq(orders.id, orderId));

    const saved = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!saved.length) {
      return json({ success: false, error: "Товар не найден" }, 404);
    }

    return json({
      success: true,
      data: { id: orderId, [field]: saved[0][column] },
    });
  } catch (error: unknown) {
    console.error("Inline order update error", error);
    const message = error instanceof Error ? error.message : "Ошибка базы данных";
    return json({ success: false, error: message }, 500);
  }
}
