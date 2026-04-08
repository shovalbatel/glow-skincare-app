import { NextRequest, NextResponse } from 'next/server';
import { IHERB_REFERRAL_CODE } from '@/lib/types';

const SYSTEM_PROMPT = `You help users find skincare products to buy. Given a product name and brand, return the cleanest possible search query that would find the product on iHerb (or any major retailer).

Rules:
- Strip volume/size hints ("50ml", "1.7 oz")
- Strip marketing fluff ("new!", "best seller")
- Keep brand + core product identifiers
- Output should be 2-6 words
- Return ONLY a JSON object: { "query": "<the cleaned search keywords>" }`;

function buildIherbUrl(query: string): string {
  return `https://www.iherb.com/search?kw=${encodeURIComponent(query)}&rcode=${IHERB_REFERRAL_CODE}`;
}

export async function POST(request: NextRequest) {
  try {
    const { name, brand } = (await request.json()) as {
      name?: string;
      brand?: string;
    };
    if (!name?.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const cleanName = name.trim();
    const cleanBrand = brand?.trim() || '';
    const fallbackQuery = [cleanBrand, cleanName].filter(Boolean).join(' ');

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      // Still useful even without an LLM — just hand back the fallback search.
      return NextResponse.json({ url: buildIherbUrl(fallbackQuery), query: fallbackQuery });
    }

    try {
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
            {
              role: 'user',
              content: `Brand: ${cleanBrand}\nName: ${cleanName}`,
            },
          ],
          max_tokens: 100,
          temperature: 0.2,
          response_format: { type: 'json_object' },
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) throw new Error(`Groq error: ${res.status}`);

      const data = (await res.json()) as {
        choices: Array<{ message: { content: string } }>;
      };
      const text = data.choices[0]?.message?.content || '';
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]) as { query?: string };
        const query = (parsed.query || '').trim();
        if (query) {
          return NextResponse.json({ url: buildIherbUrl(query), query });
        }
      }
    } catch (e) {
      console.warn('[find-buy-link] LLM call failed, falling back', e);
    }

    return NextResponse.json({ url: buildIherbUrl(fallbackQuery), query: fallbackQuery });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Buy link lookup failed' },
      { status: 500 }
    );
  }
}
