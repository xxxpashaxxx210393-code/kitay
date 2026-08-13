import { pgTable, serial, text, varchar, integer, doublePrecision, timestamp } from "drizzle-orm/pg-core";

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  imageUrl: text("image_url"),
  itemUrl: text("item_url"),
  forWhom: varchar("for_whom", { length: 255 }),
  trackNumber: varchar("track_number", { length: 255 }),
  status: varchar("status", { length: 100 }).notNull().default("В пути на склад Китая"),
  quantity: integer("quantity").notNull().default(1),
  priceCny: doublePrecision("price_cny").notNull().default(0),
  shippingChinaCny: doublePrecision("shipping_china_cny").default(0),
  shippingBelarusByn: doublePrecision("shipping_belarus_byn").default(0),
  rateCnyByn: doublePrecision("rate_cny_byn").notNull().default(0.48),
  weight: doublePrecision("weight").default(0),
  plannedDate: varchar("planned_date", { length: 100 }),
  receivedDate: varchar("received_date", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
