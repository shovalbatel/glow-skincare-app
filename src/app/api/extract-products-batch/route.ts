import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are a skincare product data extractor. This image contains ONE OR MORE skincare products. Identify ALL visible products and extract details for each one.

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
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY not set' }, { status: 500 });
    }

    const body = await request.json();
    const { image } = body as { image?: string };

    if (!image) {
      return NextResponse.json({ error: 'Provide an image' }, { status: 400 });
    }

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: image } },
              { type: 'text', text: 'Identify and extract ALL skincare products visible in this image.' },
            ],
          },
        ],
        max_tokens: 1500,
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as Record<string, Record<string, string>>)?.error?.message || `Groq API error: ${res.status}`);
    }

    const data = await res.json();
    const text = (data as { choices: Array<{ message: { content: string } }> }).choices[0]?.message?.content || '';

    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      const products = JSON.parse(arrayMatch[0]);
      return NextResponse.json(Array.isArray(products) ? products : [products]);
    }

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
