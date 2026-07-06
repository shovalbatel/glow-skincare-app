import { NextRequest, NextResponse } from 'next/server';

/**
 * Finds a product photo from the web via SerpAPI's Google Images engine.
 * Requires SERPAPI_KEY in the environment (https://serpapi.com — free tier
 * available). Returns { imageUrl } or a 4xx/5xx with { error }.
 *
 * Used both by the "Find photo" button on product cards and by Luna's
 * find_product_photo tool.
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.SERPAPI_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'SERPAPI_KEY not set — add it to .env.local to enable web photo lookup.' },
        { status: 501 }
      );
    }

    const { name, brand } = (await request.json()) as { name?: string; brand?: string };
    if (!name?.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const query = [brand?.trim(), name.trim(), 'product'].filter(Boolean).join(' ');
    const url =
      'https://serpapi.com/search.json?engine=google_images' +
      `&q=${encodeURIComponent(query)}` +
      '&ijn=0' +
      `&api_key=${apiKey}`;

    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      throw new Error(`Image search failed: ${res.status}`);
    }
    const data = (await res.json()) as {
      images_results?: Array<{ original?: string; thumbnail?: string }>;
    };

    // Pick the first result with a usable https image URL.
    const candidate = (data.images_results ?? []).find(
      (r) => typeof r.original === 'string' && r.original.startsWith('https://')
    );
    const imageUrl = candidate?.original ?? candidate?.thumbnail ?? null;

    if (!imageUrl) {
      return NextResponse.json({ error: 'No image found' }, { status: 404 });
    }
    return NextResponse.json({ imageUrl, query });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Photo lookup failed' },
      { status: 500 }
    );
  }
}
