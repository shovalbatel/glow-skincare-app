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

const SYSTEM_PROMPT = `You are an expert skincare consultant building a single day's routine for a user.

You will receive:
- The user's product library (each item has id, name, brand, category, routineTime)
- Optional skin analysis, goals, concerns
- The day's name (which may hint at intent, e.g. "Retinol Night")

Your job: design an AM routine and a PM routine for THIS day. Each routine is an ordered list of steps. Each step has a category, and either references one of the user's products by id, OR suggests a new product the user should add for that step.

STRICT RULES:
- Always prefer products the user ALREADY has (productIds drawn from the provided library). Match by category and routineTime ('am'/'pm'/'both').
- Only suggest a new product when no item in the user's library fits the step. Never recommend a product the user already has under "suggestion".
- Use only these category values: ${VALID_CATEGORIES.join(', ')}.
- Order steps correctly (cleanser → toner → serum/treatment → eye cream → moisturizer → oil → SPF for AM; cleanser → toner → treatment/serum → eye cream → night cream/moisturizer for PM).
- AM should always end with sunscreen.
- Keep each routine to 4-7 steps. Don't pad.
- For "suggestion", give a concrete product type (not a brand-name ad), e.g. "A gentle gel cleanser with niacinamide".

Return ONLY valid JSON, no markdown, in this shape:
{
  "amSteps": [
    { "category": "cleanser", "productIds": ["<id from library>"], "suggestion": null },
    { "category": "serum", "productIds": [], "suggestion": { "name": "Vitamin C serum 10-15%", "reason": "Brightens and protects against AM oxidative stress" } }
  ],
  "pmSteps": [ ... same shape ... ],
  "rationale": "1-2 sentences explaining the overall approach for this day"
}

For each step: productIds is an array (empty if suggesting). suggestion is null when productIds is non-empty.`;

type AiStep = {
  category: Category;
  productIds: string[];
  suggestion: { name: string; reason: string } | null;
};

type LibraryProduct = {
  id: string;
  name: string;
  brand: string;
  category: Category;
  routineTime: 'am' | 'pm' | 'both';
};

function sanitizeSteps(
  raw: unknown,
  library: LibraryProduct[],
  time: 'am' | 'pm'
): AiStep[] {
  if (!Array.isArray(raw)) return [];
  const validIds = new Set(library.map((p) => p.id));
  const out: AiStep[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    const category = obj.category as Category;
    if (!VALID_CATEGORIES.includes(category)) continue;

    const rawIds = Array.isArray(obj.productIds) ? (obj.productIds as unknown[]) : [];
    const productIds = rawIds
      .filter((x): x is string => typeof x === 'string' && validIds.has(x))
      // Only keep products that fit this time of day
      .filter((id) => {
        const p = library.find((q) => q.id === id);
        return p && (p.routineTime === time || p.routineTime === 'both');
      });

    let suggestion: AiStep['suggestion'] = null;
    if (productIds.length === 0) {
      const sObj = obj.suggestion as Record<string, unknown> | null | undefined;
      if (sObj && typeof sObj === 'object') {
        const name = typeof sObj.name === 'string' ? sObj.name : '';
        const reason = typeof sObj.reason === 'string' ? sObj.reason : '';
        if (name) suggestion = { name, reason };
      }
      // If LLM gave neither a productId nor a suggestion, fall back so the
      // user still sees the step and can add a product themselves.
      if (!suggestion) suggestion = { name: '', reason: '' };
    }

    out.push({ category, productIds, suggestion });
  }
  return out;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY not set' }, { status: 500 });
    }

    const { products, dayName, dayNumber, skinAnalysis, goals, concerns } =
      (await request.json()) as {
        products?: LibraryProduct[];
        dayName?: string;
        dayNumber?: number;
        skinAnalysis?: unknown;
        goals?: string[];
        concerns?: string[];
      };

    const library: LibraryProduct[] = Array.isArray(products) ? products : [];

    const slimLibrary = library.map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      category: p.category,
      routineTime: p.routineTime,
    }));

    const userContext = `DAY: ${dayName ?? 'Unnamed'}${
      dayNumber ? ` (day ${dayNumber} of cycle)` : ''
    }

USER PRODUCT LIBRARY (prefer these by id):
${JSON.stringify(slimLibrary)}

SKIN ANALYSIS: ${skinAnalysis ? JSON.stringify(skinAnalysis) : 'none'}
GOALS: ${goals?.join(', ') || 'not specified'}
CONCERNS: ${concerns?.join(', ') || 'not specified'}

Build the AM and PM routine for this day. Reference the user's products by id wherever possible. Only fall back to a "suggestion" object when no product in the library fits a needed step.`;

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
        max_tokens: 1500,
        temperature: 0.3,
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
      return NextResponse.json(
        { error: 'Could not parse routine recommendation' },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      amSteps?: unknown;
      pmSteps?: unknown;
      rationale?: unknown;
    };

    return NextResponse.json({
      amSteps: sanitizeSteps(parsed.amSteps, library, 'am'),
      pmSteps: sanitizeSteps(parsed.pmSteps, library, 'pm'),
      rationale: typeof parsed.rationale === 'string' ? parsed.rationale : '',
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Routine recommendation failed',
      },
      { status: 500 }
    );
  }
}
