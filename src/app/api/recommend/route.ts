import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are an expert skincare consultant. Based on a user's skin analysis, goals, concerns, current products, and routine, provide personalized recommendations.

Return ONLY valid JSON with these keys:
{
  "routineSuggestions": [
    {
      "type": "add_step" | "change_product" | "reorder" | "frequency",
      "title": "short actionable title",
      "description": "1-2 sentences explaining why",
      "productPick": {
        "name": "specific product name available on iHerb",
        "brand": "brand name",
        "reason": "why this product specifically",
        "category": "skincare category",
        "iherbSearch": "search query for iHerb"
      }
    }
  ],
  "productPicks": [
    {
      "name": "product name on iHerb",
      "brand": "brand",
      "reason": "why recommended for this user",
      "category": "category",
      "iherbSearch": "iHerb search query"
    }
  ],
  "logInsights": [
    "insight based on their daily logs, e.g. 'Your skin feels best on days you use hyaluronic acid serum'"
  ]
}

Rules:
- Suggest 2-4 routine changes
- Recommend 3-5 specific products available on iHerb
- Prefer popular, well-reviewed products from brands like CeraVe, The Ordinary, Paula's Choice, Cosrx, Beauty of Joseon, Anua, La Roche-Posay, Neutrogena
- iherbSearch should be the product name that would find it on iHerb.com
- Focus on affordable, effective products
- 1-3 log insights based on patterns (or empty array if no log data)
- Return ONLY JSON, no markdown fences`;

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'GROQ_API_KEY not set' }, { status: 500 });

    const {
      skinAnalysis,
      goals,
      concerns,
      currentProducts,
      routine,
      recentLogs,
    } = await request.json();

    const userContext = `
SKIN ANALYSIS: ${skinAnalysis ? JSON.stringify(skinAnalysis) : 'No skin analysis available yet'}

GOALS: ${(goals as string[])?.join(', ') || 'not specified'}
CONCERNS: ${(concerns as string[])?.join(', ') || 'not specified'}

CURRENT PRODUCTS: ${JSON.stringify(currentProducts || [])}

CURRENT ROUTINE: ${JSON.stringify(routine || [])}

RECENT DAILY LOGS (last 7 days): ${JSON.stringify(recentLogs || [])}

Based on all of this, provide personalized skincare recommendations. Focus on what's missing from their routine, what could be improved, and specific products they can buy on iHerb.`;

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
          { role: 'user', content: userContext },
        ],
        max_tokens: 2000,
        temperature: 0.4,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as Record<string, Record<string, string>>)?.error?.message || `Groq error: ${res.status}`);
    }

    const data = await res.json();
    const text = (data as { choices: Array<{ message: { content: string } }> }).choices[0]?.message?.content || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: 'Could not parse recommendations' }, { status: 500 });

    return NextResponse.json(JSON.parse(jsonMatch[0]));
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Recommendation failed' }, { status: 500 });
  }
}
