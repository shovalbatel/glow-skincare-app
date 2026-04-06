import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const PROMPT = `You are a skincare product data extractor. Given an image of a skincare product or a product page description, extract the following fields. Return ONLY valid JSON with these exact keys:

{
  "name": "product name without brand",
  "brand": "brand name",
  "category": one of: "cleanser", "toner", "serum", "moisturizer", "eye_cream", "sunscreen", "oil", "exfoliant_gentle", "exfoliant_strong", "treatment", "mask", "night_cream",
  "description": "one sentence about what the product does for skin",
  "routineTime": one of: "am", "pm", "both",
  "frequency": "how often to use, e.g. Daily, 2-3x per week",
  "notes": "any important usage notes like warnings or tips"
}

Rules:
- For category, pick the closest match from the allowed values
- For routineTime, infer from the product type (sunscreen=am, retinol=pm, moisturizer=both, etc.)
- Keep description short and focused on skin benefits
- If you can't determine a field, use a reasonable default
- Return ONLY the JSON object, no markdown fences, no explanation`;

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not set in .env.local' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const body = await request.json();
    const { image, url } = body as { image?: string; url?: string };

    if (!image && !url) {
      return NextResponse.json({ error: 'Provide either an image or a URL' }, { status: 400 });
    }

    let result;

    if (image) {
      const base64Match = image.match(/^data:(.+?);base64,(.+)$/);
      if (!base64Match) {
        return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });
      }
      const mimeType = base64Match[1];
      const data = base64Match[2];

      result = await model.generateContent([
        { inlineData: { mimeType, data } },
        { text: PROMPT + '\n\nExtract the skincare product details from this image.' },
      ]);
    } else if (url) {
      let pageText = '';
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SkincareApp/1.0)' },
          signal: AbortSignal.timeout(10000),
        });
        const html = await res.text();
        pageText = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 8000);
      } catch {
        return NextResponse.json({ error: 'Could not fetch the URL' }, { status: 400 });
      }

      result = await model.generateContent([
        { text: PROMPT + `\n\nExtract the skincare product details from this product page content:\n\n${pageText}` },
      ]);
    }

    const text = result?.response?.text() || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Could not parse product data' }, { status: 500 });
    }

    const product = JSON.parse(jsonMatch[0]);
    return NextResponse.json(product);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Extraction failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
