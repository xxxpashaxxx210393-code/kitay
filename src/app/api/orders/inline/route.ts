import { NextResponse } from "next/server";
import { pool } from "@/db";

const NUMBER_FIELDS = new Set([
  "quantity",
  "priceCny",
  "weight",
  "shippingBelarusByn",
  "shippingChinaUsd",
  "shippingUsdByn",
  "rateCnyByn",
]);

const TEXT_FIELDS = new Set([
  "name",
  "forWhom",
  "trackNumber",
  "status",
  "itemUrl",
  "imageUrl",
  "notes",
]);

const COLUMN_BY_FIELD: Record<string, string> = {
  quantity: "quantity",
  priceCny: "price_cny",
  weight: "weight",
  shippingBelarusByn: "shipping_belarus_byn",
  shippingChinaUsd: "shipping_china_usd",
  shippingUsdByn: "shipping_usd_byn",
  rateCnyByn: "rate_cny_byn",
  name: "name",
  forWhom: "for_whom",
  trackNumber: "track_number",
  status: "status",
  itemUrl: "item_url",
  imageUrl: "image_url",
  notes: "notes",
};

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

    if (!column || (!NUMBER_FIELDS.has(field) && !TEXT_FIELDS.has(field))) {
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

    const result = await pool.query(
      `UPDATE orders SET "${column}" = $1 WHERE id = $2`,
      [value, orderId]
    );

    if (result.rowCount !== 1) {
      return json({ success: false, error: "Товар не найден" }, 404);
    }

    return json({
      success: true,
      data: { id: orderId, [field]: value },
    });
  } catch (error: unknown) {
    console.error("Inline order update error", error);
    const message = error instanceof Error ? error.message : "Ошибка базы данных";
    return json({ success: false, error: message }, 500);
  }
}
