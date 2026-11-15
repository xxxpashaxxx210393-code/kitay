import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type ImageInput = { mime: string; data: string };
type Recognition = {
  name: string; quantity: number; priceCny: number; weightKg: number;
  trackNumber: string; notes: string; category: string;
  photoImageIndex: number; photoBounds: { x: number; y: number; width: number; height: number } | null;
};

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({
      success: false,
      error: "AI-распознавание пока не подключено. Нужен ключ Gemini API в настройках Vercel (GEMINI_API_KEY). Загрузка нескольких фото уже доступна."
    }, { status: 503 });

    const body = await req.json();
    const rawImages: unknown[] = Array.isArray(body?.images) ? body.images : [body?.image];
    if (!rawImages.length || rawImages.length > 5) {
      return NextResponse.json({ success: false, error: "Добавьте от 1 до 5 изображений." }, { status: 400 });
    }
    const images: ImageInput[] = [];
    for (const raw of rawImages) {
      const match = String(raw || "").match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
      if (!match) return NextResponse.json({ success: false, error: "Одно из изображений имеет неподдерживаемый формат. Используйте PNG, JPG или WEBP." }, { status: 400 });
      if (match[2].length > 14_000_000) return NextResponse.json({ success: false, error: "Одно из изображений больше 10 МБ." }, { status: 413 });
      images.push({ mime: match[1], data: match[2] });
    }

    const prompt = `Ты помощник по разбору заказов из Pinduoduo, Taobao и 1688. Пользователь загрузил ${images.length} изображений одного заказа. Изучи ВСЕ изображения вместе: они могут показывать разные части одного заказа (экран оплаты, список товаров, детали товара, трек-номер). Сопоставь информацию, не дублируй один товар из разных скриншотов. Извлекай только то, что реально видно, не угадывай.
Верни строго JSON:
{
 "name":"краткое название товара на русском",
 "quantity":1,
 "priceCny":0,
 "weightKg":0,
 "trackNumber":"",
 "notes":"цвет, размер, комплектация, SKU и другая важная информация",
 "category":"📦",
 "photoImageIndex":0,
 "photoBounds":{"x":0,"y":0,"width":1000,"height":1000}
}
quantity целое; priceCny цена товара в юанях, не общая сумма заказа и не стоимость доставки; weightKg в кг. Если данных нет, цена и вес 0, количество 1. Трек-номер перепиши точно. Название переведи на русский. category: 🎈 праздник, 🧸 игрушки, 🏠 дом, 📱 электроника, 📦 прочее.
photoImageIndex — номер изображения (начиная с 0), где лучше всего видно главное фото товара. photoBounds — координаты рамки фото на этом изображении в шкале 0..1000. Если фото товара не удаётся выделить уверенно, верни null.`;

    const parts: any[] = [{ text: prompt }];
    for (const img of images) parts.push({ inline_data: { mime_type: img.mime, data: img.data } });
    const requestBody = JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
    });
    // Try the primary model first, then automatically fall back to the lighter
    // stable multimodal model when Google reports temporary capacity pressure.
    let response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=" + encodeURIComponent(apiKey), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: requestBody, signal: AbortSignal.timeout(25000)
    });
    if (response.status === 503 || response.status === 500) {
      console.warn("Gemini 3.8 Flash is temporarily unavailable; retrying with Gemini 3.5 Flash-Lite");
      response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=" + encodeURIComponent(apiKey), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: requestBody, signal: AbortSignal.timeout(25000)
      });
    }
    const result = await response.json();
    if (!response.ok) {
      console.error("Gemini recognition error:", result);
      const message = response.status === 429 ? "Лимит AI-запросов исчерпан. Попробуйте позже." : "Gemini не смог обработать изображения. Попробуйте ещё раз. Если ошибка повторится, проверьте доступность модели в Google AI Studio.";
      return NextResponse.json({ success: false, error: message }, { status: response.status === 429 ? 429 : 502 });
    }
    const text = result?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("") || "";
    const parsed = JSON.parse(text) as Partial<Recognition>;
    const bounds = parsed.photoBounds;
    const data: Recognition = {
      name: String(parsed.name || "").trim(),
      quantity: Math.max(1, Math.round(Number(parsed.quantity) || 1)),
      priceCny: Math.max(0, Number(parsed.priceCny) || 0),
      weightKg: Math.max(0, Number(parsed.weightKg) || 0),
      trackNumber: String(parsed.trackNumber || "").trim().toUpperCase(),
      notes: String(parsed.notes || "").trim(),
      category: String(parsed.category || "📦"),
      photoImageIndex: Math.min(images.length - 1, Math.max(0, Math.round(Number(parsed.photoImageIndex) || 0))),
      photoBounds: bounds && ["x","y","width","height"].every((key) => Number.isFinite(Number((bounds as any)[key])))
        ? { x: Math.min(1000, Math.max(0, Number(bounds.x))), y: Math.min(1000, Math.max(0, Number(bounds.y))), width: Math.min(1000, Math.max(0, Number(bounds.width))), height: Math.min(1000, Math.max(0, Number(bounds.height))) }
        : null,
    };
    if (!data.name) return NextResponse.json({ success: false, error: "На этих изображениях не удалось уверенно определить товар. Добавьте более чёткий скриншот." }, { status: 422 });
    return NextResponse.json({ success: true, data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("AI screenshot recognition failed:", error);
    return NextResponse.json({ success: false, error: "Ошибка обработки изображений. Попробуйте ещё раз." }, { status: 500 });
  }
}
