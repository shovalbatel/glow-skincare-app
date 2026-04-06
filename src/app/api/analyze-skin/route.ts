import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are a dermatology-trained AI skin analyst. Given face photos and user-reported skin goals and concerns, provide a structured skin analysis.

Return ONLY valid JSON with these keys:
{
  "skinType": "oily" | "dry" | "combination" | "normal" | "sensitive",
  "visibleConcerns": ["list of visible skin concerns you can identify from the photos"],
  "overallAssessment": "2-3 sentences describing the overall skin condition and what stands out",
  "recommendations": ["3-5 high-level skincare recommendations based on what you see"]
}

IMPORTANT: Be helpful but cautious. Note that this is not a medical diagnosis. Focus on general skincare advice.
Return ONLY the JSON, no markdown fences.`;

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'GROQ_API_KEY not set' }, { status: 500 });

    const { photoUrls, goals, concerns } = await request.json() as {
      photoUrls: string[];
      goals: string[];
      concerns: string[];
    };

    if (!photoUrls || photoUrls.length === 0) {
      return NextResponse.json({ error: 'No photos provided' }, { status: 400 });
    }

    const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

    // Add photos
    for (const url of photoUrls.slice(0, 5)) {
      content.push({ type: 'image_url', image_url: { url } });
    }

    // Add context
    content.push({
      type: 'text',
      text: `Analyze this person's skin from the photos above.
Their skincare goals: ${goals.join(', ') || 'not specified'}
Their reported concerns: ${concerns.join(', ') || 'not specified'}

Provide a structured skin analysis.`,
    });

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
          { role: 'user', content },
        ],
        max_tokens: 800,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as Record<string, Record<string, string>>)?.error?.message || `Groq error: ${res.status}`);
    }

    const data = await res.json();
    const text = (data as { choices: Array<{ message: { content: string } }> }).choices[0]?.message?.content || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: 'Could not parse analysis' }, { status: 500 });

    return NextResponse.json(JSON.parse(jsonMatch[0]));
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Analysis failed' }, { status: 500 });
  }
}
