import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are a skincare product data extractor. Given an image of a skincare product or a product page description, extract the following fields. Return ONLY valid JSON with these exact keys:

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
- The source page may be in any language (English, Hebrew, Russian, Arabic, etc.). Extract the product details and translate the values to English. Keep the brand name in its original Latin form when possible.
- Return ONLY the JSON object, no markdown fences, no explanation`;

const ENRICH_PROMPT = `You are a skincare expert. You will receive a partially-filled JSON for a skincare product. Use ONLY your existing knowledge of the brand and product to refine the JSON. Improve the description (one short sentence about what it does), set the most likely category from the allowed values, set routineTime, and frequency. Keep the same JSON shape and keys. If you do NOT actually know this product, return the input UNCHANGED. Do not invent details.

Allowed categories: cleanser, toner, serum, moisturizer, eye_cream, sunscreen, oil, exfoliant_gentle, exfoliant_strong, treatment, mask, night_cream
Allowed routineTime: am, pm, both

Return ONLY the JSON object, no markdown fences, no explanation.`;

const WEB_PROMPT = `You are a skincare expert. You will receive a partially-filled JSON for a skincare product, plus short web search snippets about it. Use the snippets (and your own knowledge) to refine the JSON. Keep the same JSON shape and keys. Prefer concrete facts from the snippets for description; pick the best category from the allowed values; pick the best routineTime; pick a sensible frequency.

Allowed categories: cleanser, toner, serum, moisturizer, eye_cream, sunscreen, oil, exfoliant_gentle, exfoliant_strong, treatment, mask, night_cream
Allowed routineTime: am, pm, both

Return ONLY the JSON object, no markdown fences, no explanation.`;

interface ExtractedJson {
  name?: string;
  brand?: string;
  category?: string;
  description?: string;
  routineTime?: string;
  frequency?: string;
  notes?: string;
}

const REAL_BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15';

async function callGroq(
  messages: Array<{ role: string; content: unknown }>,
  systemPrompt: string = SYSTEM_PROMPT
) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not set in .env.local');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      max_tokens: 600,
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as Record<string, Record<string, string>>)?.error?.message || `Groq API error: ${res.status}`);
  }

  const data = await res.json();
  return (data as { choices: Array<{ message: { content: string } }> }).choices[0]?.message?.content || '';
}

function parseJson(text: string): ExtractedJson | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as ExtractedJson;
  } catch {
    return null;
  }
}

// Extract Open Graph + Twitter meta tags + JSON-LD Product blocks from raw HTML.
function extractStructuredFromHtml(html: string): { title: string; description: string; brand: string; image: string } {
  const out = { title: '', description: '', brand: '', image: '' };

  const meta = (prop: string) => {
    const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)["']`, 'i');
    const m = html.match(re);
    return m?.[1] || '';
  };
  const metaContentFirst = (prop: string) => {
    const re = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop}["']`, 'i');
    const m = html.match(re);
    return m?.[1] || '';
  };

  out.title = meta('og:title') || metaContentFirst('og:title') || meta('twitter:title') || '';
  out.description = meta('og:description') || metaContentFirst('og:description') || meta('twitter:description') || meta('description') || '';
  out.brand = meta('og:brand') || meta('product:brand') || metaContentFirst('product:brand') || '';
  out.image = meta('og:image') || metaContentFirst('og:image') || '';

  // JSON-LD Product blocks
  const ldMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of ldMatches) {
    try {
      const json = JSON.parse(m[1].trim());
      const products = Array.isArray(json) ? json : [json];
      for (const p of products) {
        if (p && (p['@type'] === 'Product' || (Array.isArray(p['@type']) && p['@type'].includes('Product')))) {
          out.title ||= p.name || '';
          out.description ||= p.description || '';
          if (typeof p.brand === 'string') out.brand ||= p.brand;
          else if (p.brand?.name) out.brand ||= p.brand.name;
          if (typeof p.image === 'string') out.image ||= p.image;
          else if (Array.isArray(p.image)) out.image ||= p.image[0] || '';
        }
      }
    } catch {
      // ignore malformed JSON-LD
    }
  }
  return out;
}

function looksGeneric(extracted: ExtractedJson): boolean {
  const d = (extracted.description || '').trim();
  return !d || d.length < 20 || /^(no\s*description|n\/?a|unknown)$/i.test(d);
}

function mergeNonEmpty(base: ExtractedJson, refined: ExtractedJson): ExtractedJson {
  const out: ExtractedJson = { ...base };
  for (const k of Object.keys(refined) as (keyof ExtractedJson)[]) {
    const v = refined[k];
    if (typeof v === 'string' && v.trim().length > 0) {
      out[k] = v as ExtractedJson[typeof k];
    }
  }
  return out;
}

async function searchWebForProduct(name: string, brand: string): Promise<string[]> {
  const query = `${brand} ${name} skincare product`.trim();
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': REAL_BROWSER_UA,
        'Accept-Language': 'en;q=0.9',
      },
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();
    const snippetRe = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    const snippets: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = snippetRe.exec(html)) !== null && snippets.length < 4) {
      const text = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (text.length > 20) snippets.push(text);
    }
    return snippets;
  } catch (e) {
    console.warn('[searchWebForProduct] failed:', e);
    return [];
  }
}

// Try to enrich an extraction with LLM knowledge first, then a real web search
// fallback if we still don't have a useful description.
async function enrichExtraction(extracted: ExtractedJson): Promise<ExtractedJson> {
  if (!extracted.name || !extracted.brand) return extracted;

  // 1. LLM-knowledge enrichment
  try {
    const refinedText = await callGroq(
      [
        {
          role: 'user',
          content: `Refine this product JSON using only what you already know about "${extracted.brand} ${extracted.name}":\n\n${JSON.stringify(extracted)}`,
        },
      ],
      ENRICH_PROMPT
    );
    const refined = parseJson(refinedText);
    if (refined) extracted = mergeNonEmpty(extracted, refined);
  } catch (e) {
    console.warn('[enrichExtraction] LLM enrich failed:', e);
  }

  if (!looksGeneric(extracted)) return extracted;
  if (!extracted.name || !extracted.brand) return extracted;

  // 2. Real web search fallback
  const snippets = await searchWebForProduct(extracted.name, extracted.brand);
  if (snippets.length === 0) return extracted;

  try {
    const webText = await callGroq(
      [
        {
          role: 'user',
          content: `Product JSON to refine:\n${JSON.stringify(extracted)}\n\nWeb search snippets about "${extracted.brand} ${extracted.name}":\n${snippets.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
        },
      ],
      WEB_PROMPT
    );
    const refined = parseJson(webText);
    if (refined) extracted = mergeNonEmpty(extracted, refined);
  } catch (e) {
    console.warn('[enrichExtraction] web enrich failed:', e);
  }

  return extracted;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, url, name, brand } = body as { image?: string; url?: string; name?: string; brand?: string };

    // Manual enrichment path: name+brand only, no image, no URL.
    if (!image && !url && name && brand) {
      const enriched = await enrichExtraction({ name, brand });
      return NextResponse.json(enriched);
    }

    if (!image && !url) {
      return NextResponse.json({ error: 'Provide either an image or a URL' }, { status: 400 });
    }

    let text: string;
    let urlStructured: { title: string; description: string; brand: string; image: string } | null = null;

    if (image) {
      const base64Match = image.match(/^data:(.+?);base64,(.+)$/);
      if (!base64Match) {
        return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });
      }

      text = await callGroq([{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: image } },
          { type: 'text', text: 'Extract the skincare product details from this image.' },
        ],
      }]);
    } else {
      let pageText = '';
      let structured = { title: '', description: '', brand: '', image: '' };
      try {
        const res = await fetch(url!, {
          headers: {
            'User-Agent': REAL_BROWSER_UA,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en;q=0.9, he;q=0.8',
          },
          signal: AbortSignal.timeout(12000),
        });
        // Decode using the charset from the response header (some Hebrew/legacy
        // sites still use windows-1255 / iso-8859-8 instead of UTF-8). Falling
        // back to res.text() would mojibake those pages and the LLM would not
        // be able to extract anything.
        const buf = new Uint8Array(await res.arrayBuffer());
        const ctype = res.headers.get('content-type') || '';
        let charset = (ctype.match(/charset=([^;]+)/i)?.[1] || '').toLowerCase().trim();
        let html: string;
        try {
          html = new TextDecoder(charset || 'utf-8').decode(buf);
        } catch {
          html = new TextDecoder('utf-8').decode(buf);
          charset = 'utf-8';
        }
        // Some sites omit the charset header but declare it via <meta>; if we
        // didn't find one above, sniff the first few KB and re-decode.
        if (!charset) {
          const sniff = new TextDecoder('utf-8').decode(buf.slice(0, 2048));
          const m = sniff.match(/<meta[^>]+charset=["']?([\w-]+)/i);
          if (m && m[1].toLowerCase() !== 'utf-8') {
            try {
              html = new TextDecoder(m[1].toLowerCase()).decode(buf);
            } catch {
              /* ignore */
            }
          }
        }
        structured = extractStructuredFromHtml(html);
        pageText = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 16000);
      } catch (e) {
        console.warn('[extract-product] URL fetch failed:', e);
        return NextResponse.json({ error: 'Could not fetch the URL' }, { status: 400 });
      }

      urlStructured = structured;
      const structuredBlock =
        structured.title || structured.description || structured.brand
          ? `Structured metadata extracted from the page:\nTitle: ${structured.title}\nBrand: ${structured.brand}\nDescription: ${structured.description}\n\n`
          : '';

      text = await callGroq([{
        role: 'user',
        content: `${structuredBlock}Extract the skincare product details from this product page content:\n\n${pageText}`,
      }]);
    }

    let extracted = parseJson(text);

    // Fallback path for URL extraction: if the LLM failed to return JSON or
    // the page is in a language the model handled poorly (e.g. Hebrew), build
    // a minimal record from the structured metadata so the user can edit it
    // instead of seeing a hard error.
    if ((!extracted || !extracted.name) && urlStructured && (urlStructured.title || urlStructured.brand)) {
      const fallback: ExtractedJson = extracted || {};
      const title = urlStructured.title.trim();
      const brand = urlStructured.brand.trim();
      // If the title leads with the brand, strip it from the name.
      const name =
        brand && title.toLowerCase().startsWith(brand.toLowerCase())
          ? title.slice(brand.length).replace(/^[\s\-–|:•]+/, '').trim()
          : title;
      fallback.name ||= name || title || 'Product';
      fallback.brand ||= brand || '';
      fallback.description ||= urlStructured.description || '';
      fallback.category ||= 'serum';
      fallback.routineTime ||= 'both';
      fallback.frequency ||= 'daily';
      fallback.notes ||= '';
      extracted = fallback;
    }

    if (!extracted) {
      return NextResponse.json({ error: 'Could not parse product data' }, { status: 500 });
    }

    if (!extracted.name) {
      return NextResponse.json({ error: 'No product data found on this page' }, { status: 422 });
    }

    extracted = await enrichExtraction(extracted);

    // For URL-based extraction, surface the source URL as a buy link the user
    // can use later from the shop page.
    const response: ExtractedJson & { purchaseUrl?: string } = { ...extracted };
    if (url) response.purchaseUrl = url;

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('[extract-product] error:', error);
    const message = error instanceof Error ? error.message : 'Extraction failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
