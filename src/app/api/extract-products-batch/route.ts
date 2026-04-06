import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const PROMPT = `You are a skincare product data extractor. This image contains ONE OR MORE skincare products. Identify ALL visible products and extract details for each one.

Return a JSON ARRAY of objects. Each object must have these exact keys:
{
  "name": "product name without brand",
  "brand": "brand name",
  "category": one of: "cleanser", "toner", "serum", "moisturizer", "eye_cream", "sunscreen", "oil", "exfoliant_gentle", "exfoliant_strong", "treatment", "mask", "night_cream",
  "description": "one sentence about what the product does for skin",
  "routineTime": one of: "am", "pm", "both",
  "frequency": "how often to use, e.g. Daily, 2-3x per week",
  "notes": "any important usage notes"
}

Rules:
- Return a JSON ARRAY even if only one product is visible
- For category, pick the closest match from the allowed values
- For routineTime, infer from the product type (sunscreen=am, retinol=pm, moisturizer=both, etc.)
- Keep description short and focused on skin benefits
- If you can't determine a field, use a reasonable default
- Return ONLY the JSON array, no markdown fences, no explanation`;

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const body = await request.json();
    const { image } = body as { image?: string };

    if (!image) {
      return NextResponse.json({ error: 'Provide an image' }, { status: 400 });
    }

    const base64Match = image.match(/^data:(.+?);base64,(.+)$/);
    if (!base64Match) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });
    }

    const result = await model.generateContent([
      { inlineData: { mimeType: base64Match[1], data: base64Match[2] } },
      { text: PROMPT },
    ]);

    const text = result?.response?.text() || '';

    // Try to parse as array first
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      const products = JSON.parse(arrayMatch[0]);
      return NextResponse.json(Array.isArray(products) ? products : [products]);
    }

    // Fallback: try single object and wrap in array
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) {
      return NextResponse.json([JSON.parse(objMatch[0])]);
    }

    return NextResponse.json({ error: 'Could not parse product data' }, { status: 500 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Extraction failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
