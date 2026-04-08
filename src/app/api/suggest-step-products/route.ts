import { NextRequest, NextResponse } from 'next/server';

const VALID_CATEGORIES = [
  'cleanser',
  'toner',
  'serum',
  'moisturizer',
  'eye_cream',
  'sunscreen',
  'oil',
  'exfoliant_gentle',
  'exfoliant_strong',
  'treatment',
  'mask',
  'night_cream',
] as const;

type Category = (typeof VALID_CATEGORIES)[number];

const SYSTEM_PROMPT = `You are an expert skincare consultant. The user is building one step of their routine and needs 2-3 product options to consider buying for that step.

You will receive:
- The step's category and time of day (am/pm)
- The user's skin goals and concerns (optional)
- A list of products the user already owns (so you don't recommend duplicates)

Return EXACTLY 2-3 product picks that are:
- Suitable for the given category and time of day
- Real, popular, well-reviewed products from accessible brands (CeraVe, The Ordinary, Paula's Choice, Cosrx, Beauty of Joseon, Anua, La Roche-Posay, Neutrogena, Bioderma, Eucerin, etc.)
- Different from anything in the user's library
- Span a price/intensity range when possible (one budget pick, one mid, one premium or one gentle / one stronger)

Return ONLY valid JSON, no markdown, in this shape:
{
  "picks": [
    {
      "name": "product name as it appears on iHerb",
      "brand": "brand",
      "reason": "1 short sentence: why this product for this step",
      "category": "<one of the valid categories>"
    }
  ]
}

Always 2-3 picks. Never empty. Never more than 3.`;

type LibraryProduct = {
  name: string;
  brand: string;
  category: Category;
};

type Pick = {
  name: string;
  brand: string;
  reason: string;
  category: Category;
};

function sanitizePicks(raw: unknown): Pick[] {
  if (!Array.isArray(raw)) return [];
  const out: Pick[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    const name = typeof obj.name === 'string' ? obj.name.trim() : '';
    const brand = typeof obj.brand === 'string' ? obj.brand.trim() : '';
    const reason = typeof obj.reason === 'string' ? obj.reason.trim() : '';
    const category = obj.category as Category;
    if (!name) continue;
    out.push({
      name,
      brand,
      reason,
      category: VALID_CATEGORIES.includes(category) ? category : 'serum',
    });
    if (out.length === 3) break;
  }
  return out;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY not set' }, { status: 500 });
    }

    const { category, time, goals, concerns, library } = (await request.json()) as {
      category?: Category;
      time?: 'am' | 'pm';
      goals?: string[];
      concerns?: string[];
      library?: LibraryProduct[];
    };

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }
    const slot: 'am' | 'pm' = time === 'pm' ? 'pm' : 'am';
    const slimLibrary = (library ?? []).map((p) => ({
      name: p.name,
      brand: p.brand,
      category: p.category,
    }));

    const userContext = `STEP CATEGORY: ${category}
TIME OF DAY: ${slot}

GOALS: ${goals?.join(', ') || 'not specified'}
CONCERNS: ${concerns?.join(', ') || 'not specified'}

USER ALREADY OWNS (do NOT recommend any of these):
${JSON.stringify(slimLibrary)}

Suggest 2-3 ${category} products suitable for ${slot === 'am' ? 'morning' : 'evening'} use.`;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContext },
        ],
        max_tokens: 800,
        temperature: 0.4,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        (err as Record<string, Record<string, string>>)?.error?.message ||
          `Groq error: ${res.status}`
      );
    }

    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const text = data.choices[0]?.message?.content || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Could not parse picks' }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]) as { picks?: unknown };
    const picks = sanitizePicks(parsed.picks);

    if (picks.length === 0) {
      return NextResponse.json(
        { error: 'No suggestions returned' },
        { status: 500 }
      );
    }

    return NextResponse.json({ picks });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Suggestion failed',
      },
      { status: 500 }
    );
  }
}
