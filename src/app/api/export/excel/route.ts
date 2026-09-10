import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { db } from "@/db";
import { orders, projects } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const projectIdRaw = params.get("projectId");
    const projectId = projectIdRaw ? Number(projectIdRaw) : null;
    const usdKg = Math.max(0, Number(params.get("usdKg") || 5.5));
    const usdBynFallback = Math.max(0, Number(params.get("usdByn") || 3.25));

    const projectRows = await db.select().from(projects).orderBy(desc(projects.id));
    const orderRows = projectId
      ? await db.select().from(orders).where(eq(orders.projectId, projectId)).orderBy(desc(orders.id))
      : await db.select().from(orders).orderBy(desc(orders.id));
    const pmap = new Map(projectRows.map(p => [p.id, p.name]));

    const wb = new ExcelJS.Workbook();
    wb.creator = "Карго-Контроль";
    wb.created = new Date();
    const ws = wb.addWorksheet("Заказы", { views: [{ state: "frozen", ySplit: 1 }] });
    ws.columns = [
      { header: "ID", key: "id", width: 8 }, { header: "Проект", key: "project", width: 24 }, { header: "Фото", key: "photo", width: 12 },
      { header: "Название", key: "name", width: 30 }, { header: "Для кого", key: "forWhom", width: 18 }, { header: "Трек-номер", key: "track", width: 24 },
      { header: "Статус", key: "status", width: 25 }, { header: "Количество", key: "qty", width: 12 }, { header: "Цена CNY", key: "price", width: 12 },
      { header: "Общая CNY", key: "totalCny", width: 14 }, { header: "Курс CNY→BYN", key: "rate", width: 15 }, { header: "Доставка Китай, $", key: "shipUsd", width: 18 },
      { header: "USD→BYN", key: "usdByn", width: 12 }, { header: "Доставка Китай, BYN", key: "shipByn", width: 20 }, { header: "Доставка РБ, BYN", key: "belarus", width: 18 },
      { header: "Итого BYN", key: "totalByn", width: 16 }, { header: "Себестоимость/ед., BYN", key: "unitByn", width: 22 }, { header: "Вес, кг", key: "weight", width: 12 },
      { header: "Ссылка", key: "url", width: 45 }, { header: "Дата", key: "date", width: 22 }, { header: "План", key: "planned", width: 14 }, { header: "Получен", key: "received", width: 14 }, { header: "Заметки", key: "notes", width: 35 }
    ];

    orderRows.forEach((o, i) => {
      const qty = Math.max(1, Number(o.quantity || 1));
      const price = Number(o.priceCny || 0);
      const rate = Number(o.rateCnyByn || 0.48);
      const weight = Number(o.weight || 0);
      const shipUsd = Number(o.shippingChinaUsd ?? (weight * usdKg));
      const usdByn = Number((o as any).shippingUsdByn || usdBynFallback);
      const belarus = Number(o.shippingBelarusByn || 0);
      const totalCny = qty * price;
      const itemByn = totalCny * rate;
      const shipByn = shipUsd * usdByn;
      const totalByn = itemByn + shipByn + belarus;
      const row = ws.addRow({
        id: o.id, project: pmap.get(o.projectId) || String(o.projectId), photo: "", name: o.name, forWhom: o.forWhom || "", track: o.trackNumber || "", status: o.status,
        qty, price, totalCny, rate, shipUsd, usdByn, shipByn, belarus, totalByn, unitByn: totalByn / qty, weight,
        url: o.itemUrl || "", date: o.createdAt, planned: o.plannedDate || "", received: o.receivedDate || "", notes: o.notes || ""
      });
      row.height = 62;
      row.alignment = { vertical: "middle", wrapText: true };

      const image = typeof o.imageUrl === "string" && o.imageUrl.startsWith("data:image/") ? o.imageUrl : null;
      const m = image?.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/i);
      if (m) {
        try {
          let ext = m[1].toLowerCase(); if (ext === "jpg") ext = "jpeg";
          const imageId = wb.addImage({ base64: `data:image/${ext};base64,${m[2]}`, extension: ext as any });
          ws.addImage(imageId, { tl: { col: 2, row: i + 1 }, ext: { width: 58, height: 58 } });
          row.getCell(3).value = "Фото";
        } catch (e) { console.warn("Excel image skipped", e); }
      }
    });

    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF10233E" } };
    ws.getRow(1).alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    ws.getRow(1).height = 30;
    ws.autoFilter = { from: "A1", to: "W1" };

    const info = wb.addWorksheet("Проекты");
    info.columns = [{ header: "ID", key: "id", width: 8 }, { header: "Название", key: "name", width: 36 }, { header: "Создан", key: "created", width: 24 }];
    projectRows.forEach(p => info.addRow({ id:p.id, name:p.name, created:p.createdAt }));
    info.getRow(1).font = { bold: true };

    const buffer = await wb.xlsx.writeBuffer();
    const suffix = projectId ? `project-${projectId}` : "full";
    return new NextResponse(buffer as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="kitay-${suffix}-${new Date().toISOString().slice(0,10)}.xlsx"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error: any) {
    console.error("Excel export failed:", error);
    return NextResponse.json({ success:false, error:error?.message || "Не удалось создать Excel" }, { status:500 });
  }
}
