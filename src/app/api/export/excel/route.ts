import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { db } from "@/db";
import { orders, projects } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const [projectRows, orderRows] = await Promise.all([
      db.select().from(projects).orderBy(desc(projects.id)),
      db.select().from(orders).orderBy(desc(orders.id)),
    ]);
    const params = new URL(req.url).searchParams;
    const usdKg = Math.max(0, Number(params.get("usdKg") || 5.5));
    const usdByn = Math.max(0, Number(params.get("usdByn") || 3.25));
    const pmap = new Map(projectRows.map(p => [p.id, p.name]));
    const wb = new ExcelJS.Workbook();
    wb.creator = "Карго-Контроль";
    const ws = wb.addWorksheet("Заказы");
    ws.columns = [
      { header: "ID", key: "id", width: 8 }, { header: "Проект", key: "project", width: 24 }, { header: "Фото", key: "photo", width: 12 },
      { header: "Название", key: "name", width: 30 }, { header: "Для кого", key: "forWhom", width: 18 }, { header: "Трек-номер", key: "track", width: 24 },
      { header: "Статус", key: "status", width: 25 }, { header: "Количество", key: "qty", width: 12 }, { header: "Цена CNY", key: "price", width: 12 },
      { header: "Общая CNY", key: "totalCny", width: 14 }, { header: "Доставка Китай, $", key: "shipUsd", width: 18 }, { header: "USD→BYN", key: "usdByn", width: 12 },
      { header: "Доставка Китай, BYN", key: "shipByn", width: 20 }, { header: "Доставка РБ, BYN", key: "belarus", width: 18 }, { header: "Итого BYN", key: "totalByn", width: 16 },
      { header: "Вес, кг", key: "weight", width: 12 }, { header: "Ссылка", key: "url", width: 45 }, { header: "Дата", key: "date", width: 22 }
    ];
    orderRows.forEach((o, i) => {
      const qty = Number(o.quantity || 1), price = Number(o.priceCny || 0), rate = Number(o.rateCnyByn || 0.48);
      const shipUsd = Number(o.shippingChinaUsd ?? (Number(o.weight || 0) * usdKg));
      const belarus = Number(o.shippingBelarusByn || 0);
      const totalCny = qty * price, itemByn = totalCny * rate, shipByn = shipUsd * usdByn, totalByn = itemByn + shipByn + belarus;
      const row = ws.addRow({ id: o.id, project: pmap.get(o.projectId) || String(o.projectId), photo: "", name: o.name, forWhom: o.forWhom || "", track: o.trackNumber || "", status: o.status, qty, price, totalCny, shipUsd, usdByn, shipByn, belarus, totalByn, weight: o.weight || 0, url: o.itemUrl || "", date: o.createdAt });
      row.height = 62;
      const image = typeof o.imageUrl === "string" && o.imageUrl.startsWith("data:image/") ? o.imageUrl : null;
      const m = image?.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i);
      if (m) {
        try {
          let ext = m[1].toLowerCase(); if (ext === "jpg") ext = "jpeg"; if (ext === "webp") ext = "jpeg";
          const imageId = wb.addImage({ base64: `data:image/${ext};base64,${m[2]}`, extension: ext as any });
          ws.addImage(imageId, { tl: { col: 2, row: i + 1 }, ext: { width: 58, height: 58 } });
          row.getCell(3).value = "Фото";
        } catch {}
      }
    });
    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF10233E" } };
    ws.views = [{ state: "frozen", ySplit: 1 }];
    const buffer = await wb.xlsx.writeBuffer();
    return new NextResponse(buffer as BodyInit, { status: 200, headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="kitay-full-${new Date().toISOString().slice(0,10)}.xlsx"`, "Cache-Control": "no-store" } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Не удалось создать Excel" }, { status: 500 });
  }
}
