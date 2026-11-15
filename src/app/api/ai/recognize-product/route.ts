import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type Recognition = {
  name: string;
  quantity: number;
  priceCny: number;
  weightKg: number;
  trackNumber: string;
  notes: string;
  category: string;
  photoBounds: { x: number; y: number; width: number; height: number } | null;
};

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "AI не подключён: добавьте GEMINI_API_KEY в переменные окружения Vercel." },
        { status: 503 }
      );
    }

    const body = await req.json();
    const image = String(body?.image || "");
    const match = image.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!match) {
      return NextResponse.json({ success: false, error: "Не удалось прочитать изображение. Загрузите PNG, JPG или WEBP." }, { status: 400 });
    }
    if (match[2].length > 14_000_000) {
      return NextResponse.json({ success: false, error: "Изображение слишком большое. Максимум 10 МБ." }, { status: 413 });
    }

    const prompt = `Ты помощник по разбору заказов из китайских интернет-магазинов Pinduoduo, Taobao и 1688.
Внимательно изучи изображение. Извлеки данные ТОЛЬКО если они видны. Не выдумывай значения.
Верни строго один JSON-объект без markdown:
{
 "name": "краткое название товара на русском",
 "quantity": 1,
 "priceCny": 0,
 "weightKg": 0,
 "trackNumber": "",
 "notes": "цвет, размер, комплектация, SKU или другая важная информация",
 "category": "📦",
 "photoBounds": {"x":0,"y":0,"width":1000,"height":1000}
}
Числа: quantity целое, priceCny цена товара в юанях, weightKg вес в кг. Если значение не видно, используй 0, а не догадку; quantity по умолчанию 1. Трек-номер перепиши точно, сохраняя буквы и цифры. Название переведи на русский. category выбери подходящую эмодзи: 🎈 шары/праздник, 🧸 игрушки, 🏠 дом/кухня, 📱 электроника, 📦 прочее.
photoBounds: координаты прямоугольника главного фото товара на всём скриншоте в шкале 0..1000 (x,y,width,height). Если фото товара отсутствует или его нельзя уверенно выделить, верни null. Не включай текст, цену и элементы интерфейса в прямоугольник. Если товар изображён на всём кадре без отдельного фото, верни null.`;

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + encodeURIComponent(apiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [
          { text: prompt },
          { inline_data: { mime_type: match[1], data: match[2] } }
        ] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
      }),
      signal: AbortSignal.timeout(50000)
    });

    const result = await response.json();
    if (!response.ok) {
      console.error("Gemini recognition error:", result);
      const message = response.status === 429
        ? "Лимит AI-запросов исчерпан. Попробуйте позже."
        : "AI-сервис не смог обработать изображение. Проверьте ключ Gemini и повторите попытку.";
      return NextResponse.json({ success: false, error: message }, { status: response.status === 429 ? 429 : 502 });
    }

    const text = result?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("") || "";
    const parsed = JSON.parse(text) as Partial<Recognition>;
    const data: Recognition = {
      name: String(parsed.name || "").trim(),
      quantity: Math.max(1, Math.round(Number(parsed.quantity) || 1)),
      priceCny: Math.max(0, Number(parsed.priceCny) || 0),
      weightKg: Math.max(0, Number(parsed.weightKg) || 0),
      trackNumber: String(parsed.trackNumber || "").trim().toUpperCase(),
      notes: String(parsed.notes || "").trim(),
      category: String(parsed.category || "📦"),
      photoBounds: parsed.photoBounds && ["x","y","width","height"].every((key) => Number.isFinite(Number((parsed.photoBounds as any)[key])))
        ? {
            x: Math.min(1000, Math.max(0, Number(parsed.photoBounds.x))),
            y: Math.min(1000, Math.max(0, Number(parsed.photoBounds.y))),
            width: Math.min(1000, Math.max(0, Number(parsed.photoBounds.width))),
            height: Math.min(1000, Math.max(0, Number(parsed.photoBounds.height))),
          }
        : null,
    };
    if (!data.name) {
      return NextResponse.json({ success: false, error: "На скриншоте не удалось уверенно определить название товара. Попробуйте более чёткое фото." }, { status: 422 });
    }
    return NextResponse.json({ success: true, data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("AI screenshot recognition failed:", error);
    return NextResponse.json({ success: false, error: "Ошибка обработки изображения. Попробуйте ещё раз." }, { status: 500 });
  }
}
