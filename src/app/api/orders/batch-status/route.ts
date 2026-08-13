import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { inArray } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { trackNumbersText, targetStatus } = body;

    if (!trackNumbersText || typeof trackNumbersText !== "string") {
      return NextResponse.json({ success: false, error: "Список трек-номеров пуст" }, { status: 400 });
    }

    if (!targetStatus || typeof targetStatus !== "string") {
      return NextResponse.json({ success: false, error: "Не выбран новый статус" }, { status: 400 });
    }

    // Parse the track numbers by splitting by newlines, commas, semicolons, or spaces, then cleaning
    const rawTracks = trackNumbersText.split(/[\n,;\s\t]+/);
    const cleanedTracks = Array.from(
      new Set(
        rawTracks
          .map((t) => t.trim())
          .filter((t) => t.length > 0)
      )
    );

    if (cleanedTracks.length === 0) {
      return NextResponse.json({ success: false, error: "Не найдено корректных трек-номеров в списке" }, { status: 400 });
    }

    // Retrieve all existing orders matching these track numbers
    const existingOrders = await db
      .select()
      .from(orders)
      .where(inArray(orders.trackNumber, cleanedTracks));

    const matchedTracks = existingOrders.map(o => o.trackNumber).filter(Boolean) as string[];
    const unmatchedTracks = cleanedTracks.filter(track => {
      return !matchedTracks.some(m => m.toLowerCase() === track.toLowerCase());
    });

    let updatedCount = 0;
    if (matchedTracks.length > 0) {
      const updatedRows = await db
        .update(orders)
        .set({ status: targetStatus })
        .where(inArray(orders.trackNumber, matchedTracks))
        .returning();
      updatedCount = updatedRows.length;
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      targetStatus,
      totalRequested: cleanedTracks.length,
      matchedTracks,
      unmatchedTracks,
    });
  } catch (error: any) {
    console.error("Error in POST /api/orders/batch-status:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
