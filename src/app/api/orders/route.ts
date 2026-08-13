import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { desc, sql } from "drizzle-orm";

// Prepopulated list based on the user's screenshot
const MOCK_ORDERS = [
  {
    name: "ПЫЛЕСОС ДЛЯ АВТО",
    imageUrl: "https://images.unsplash.com/photo-1614002930263-fb52914619d8?w=300&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    itemUrl: "https://mobile.yangkeduo.com/goods2.html?ps=t71at3ollr",
    forWhom: "Родители",
    trackNumber: "465559467289088",
    status: "В пути на склад Китая",
    quantity: 1,
    priceCny: 269.00,
    shippingChinaCny: 0,
    shippingBelarusByn: 0,
    rateCnyByn: 0.4800,
    weight: 1.2,
    plannedDate: "2026-04-15",
    receivedDate: "",
    notes: "Мощный автопылесос с фильтром",
  },
  {
    name: "ПАКЕТЫ ДЛЯ ВАКУУМА",
    imageUrl: "https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=300&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    itemUrl: "https://mobile.yangkeduo.com/goods.html?ps=27C9WIUGRI",
    forWhom: "Родители",
    trackNumber: "JT5512110631642",
    status: "В пути на склад Китая",
    quantity: 1,
    priceCny: 30.00,
    shippingChinaCny: 0,
    shippingBelarusByn: 0,
    rateCnyByn: 0.4800,
    weight: 0.4,
    plannedDate: "2026-04-15",
    receivedDate: "",
    notes: "Пакеты 10шт с клапаном",
  },
  {
    name: "ФЕН",
    imageUrl: "https://images.unsplash.com/photo-1522337360788-8b13edd793be?w=300&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    itemUrl: "https://mobile.yangkeduo.com/goods.html?ps=D8ZpwJ5HSG",
    forWhom: "Родители",
    trackNumber: "465561361436395",
    status: "На складе в Китае",
    quantity: 1,
    priceCny: 40.00,
    shippingChinaCny: 0,
    shippingBelarusByn: 0,
    rateCnyByn: 0.4800,
    weight: 0.6,
    plannedDate: "2026-04-10",
    receivedDate: "",
    notes: "Мощный фен с насадками",
  },
  {
    name: "ФЕН ЧЕРНЫЙ",
    imageUrl: "https://images.unsplash.com/photo-1563132337-f159f484226c?w=300&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    itemUrl: "https://mobile.yangkeduo.com/goods.html?ps=MRHXA45KBu",
    forWhom: "Родители",
    trackNumber: "465570000180274",
    status: "На складе в Китае",
    quantity: 1,
    priceCny: 34.00,
    shippingChinaCny: 0,
    shippingBelarusByn: 0,
    rateCnyByn: 0.4800,
    weight: 0.6,
    plannedDate: "2026-04-10",
    receivedDate: "",
    notes: "Черный матовый фен",
  },
  {
    name: "ПЕРЕХОДНИК НА РОЗЕТКУ",
    imageUrl: "https://images.unsplash.com/photo-1558489815-56450f7fcf03?w=300&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    itemUrl: "https://mobile.yangkeduo.com/goods2.html?ps=3stKSN1Aj",
    forWhom: "Родители",
    trackNumber: "46556004721643",
    status: "На складе в Китае",
    quantity: 1,
    priceCny: 6.67,
    shippingChinaCny: 0,
    shippingBelarusByn: 0,
    rateCnyByn: 0.4800,
    weight: 0.1,
    plannedDate: "2026-04-05",
    receivedDate: "2026-04-04",
    notes: "Переходник с китайской вилки",
  }
];

export async function GET() {
  try {
    // Zero-friction table auto-initializer. Ensures table exists in any database on first boot!
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "orders" (
        "id" serial PRIMARY KEY,
        "name" text NOT NULL,
        "image_url" text,
        "item_url" text,
        "for_whom" varchar(255),
        "track_number" varchar(255),
        "status" varchar(100) NOT NULL DEFAULT 'В пути на склад Китая',
        "quantity" integer NOT NULL DEFAULT 1,
        "price_cny" double precision NOT NULL DEFAULT 0,
        "shipping_china_cny" double precision DEFAULT 0,
        "shipping_belarus_byn" double precision DEFAULT 0,
        "rate_cny_byn" double precision NOT NULL DEFAULT 0.48,
        "weight" double precision DEFAULT 0,
        "planned_date" varchar(100),
        "received_date" varchar(100),
        "notes" text,
        "created_at" timestamp NOT NULL DEFAULT now()
      );
    `);

    // Read list of orders
    let list = await db.select().from(orders).orderBy(desc(orders.id));
    
    // Autoseed if empty
    if (list.length === 0) {
      await db.insert(orders).values(MOCK_ORDERS);
      list = await db.select().from(orders).orderBy(desc(orders.id));
    }
    
    return NextResponse.json({ success: true, data: list });
  } catch (error: any) {
    console.error("Error in GET /api/orders:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      imageUrl,
      itemUrl,
      forWhom,
      trackNumber,
      status,
      quantity,
      priceCny,
      shippingChinaCny,
      shippingBelarusByn,
      rateCnyByn,
      weight,
      plannedDate,
      receivedDate,
      notes
    } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: "Название товара обязательно" }, { status: 400 });
    }

    const newOrder = await db.insert(orders).values({
      name,
      imageUrl: imageUrl || null,
      itemUrl: itemUrl || null,
      forWhom: forWhom || "Себе",
      trackNumber: trackNumber || null,
      status: status || "В пути на склад Китая",
      quantity: quantity !== undefined ? Number(quantity) : 1,
      priceCny: priceCny !== undefined ? Number(priceCny) : 0,
      shippingChinaCny: shippingChinaCny !== undefined ? Number(shippingChinaCny) : 0,
      shippingBelarusByn: shippingBelarusByn !== undefined ? Number(shippingBelarusByn) : 0,
      rateCnyByn: rateCnyByn !== undefined ? Number(rateCnyByn) : 0.48,
      weight: weight !== undefined ? Number(weight) : 0,
      plannedDate: plannedDate || null,
      receivedDate: receivedDate || null,
      notes: notes || null,
    }).returning();

    return NextResponse.json({ success: true, data: newOrder[0] });
  } catch (error: any) {
    console.error("Error in POST /api/orders:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    // Drop all entries inside the orders table
    await db.delete(orders);
    return NextResponse.json({ success: true, message: "Все товары успешно удалены из базы" });
  } catch (error: any) {
    console.error("Error in DELETE /api/orders:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
