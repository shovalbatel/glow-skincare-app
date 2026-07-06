import { NextRequest, NextResponse } from 'next/server';

/**
 * Luna — the conversational skincare agent.
 *
 * The client drives a small tool-calling loop: it POSTs the running message
 * list plus a compact snapshot of the user's app state (`context`). Groq may
 * reply with plain text OR with `tool_calls`. When it returns tool calls the
 * client executes them locally (they touch Supabase via the existing store
 * helpers), appends the tool results, and calls again until Luna produces a
 * final text reply.
 */

const AGENT_NAME = 'Luna';

// llama-3.3-70b is the most reliable Groq model for function calling.
const MODEL = 'llama-3.3-70b-versatile';

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

const VALID_STATUS = [
  'have',
  'need_to_buy',
  'almost_empty',
  'repurchase',
  'do_not_repurchase',
] as const;

function systemPrompt(context: unknown): string {
  const lang = (context as { language?: string } | undefined)?.language;
  const languageName = lang === 'he' ? 'Hebrew (עברית)' : 'English';
  return `You are ${AGENT_NAME}, a warm, encouraging and knowledgeable skincare companion inside the user's personal skincare app "Glow". You speak in a friendly, concise, upbeat tone — like a caring friend who happens to be a skincare expert. Keep replies short (1-4 sentences) unless the user asks for detail. You may use the occasional tasteful emoji (✨🌙).

LANGUAGE: The user's app language is ${languageName}. ALWAYS write every reply in ${languageName}, regardless of the language these instructions are written in. If the user switches and writes in a different language, reply in the language the user just used. Never mix languages within a reply. Product and brand names may stay in their original spelling.

WHAT YOU CAN DO FOR THE USER:
- Help plan their MORNING (am) or EVENING (pm) routine, step by step.
- Log that they completed a routine today ("I did my morning routine").
- Track their night ROTATION (an ordered list of night protocols) and tell them which night is next; advance it when they finish a night.
- Add products to their product list, or update a product's status / rating / inventory level / notes.
- Recommend specific real products they can buy.
- Keep their skincare knowledge base: add JOURNAL entries (milestones/events), record DECISIONS (with a reason), and capture INSIGHTS (things learned about their skin).
- Update their CURRENT STATE snapshot (skin score, barrier, hydration, priorities, follow-ups…).

HOW TO BEHAVE:
- Be proactive but never guess destructive things. Ask a brief clarifying question when key info is missing (which time of day? how did your skin feel?).
- ALWAYS prefer products the user ALREADY OWNS when suggesting routine steps. Only recommend buying something new when there's a genuine gap.
- When you suggest building a routine, build it one logical order at a time (cleanser → toner → serum/treatment → eye cream → moisturizer → sunscreen for AM; cleanser → toner → treatment → serum → eye cream → moisturizer/night cream for PM).
- A routine step can exist WITHOUT a product attached — if the user needs a product for a step but doesn't own one, add the step anyway and offer to recommend/add a product for it.
- When recommending products to BUY, prefer popular well-reviewed brands (CeraVe, The Ordinary, Paula's Choice, Cosrx, Beauty of Joseon, Anua, La Roche-Posay, Neutrogena).
- After you take an action with a tool, confirm what you did in a short friendly sentence and suggest a natural next step.
- Use the tools to actually make changes. Do not claim you did something unless you called the matching tool.
- When the user tells you something worth remembering long-term (a decision, an observation about what works, a milestone), record it with the matching tool (log_decision / record_insight / add_journal_entry) so it's saved.
- When the user reports a change in their skin (e.g. "my barrier feels great", "skin score is about 9"), update the current-state snapshot.

VALID PRODUCT CATEGORIES: ${VALID_CATEGORIES.join(', ')}.
VALID PRODUCT STATUSES: ${VALID_STATUS.join(', ')}.
VALID INVENTORY LEVELS: new, medium, low, empty, unknown.
PRODUCT TAGS: core, occasional, finish_first, buy_next, monitor, replace_when_empty.

Here is a snapshot of the user's current data (JSON). Use it to answer questions and avoid duplicate suggestions:
${JSON.stringify(context ?? {}, null, 0)}`;
}

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'log_routine',
      description:
        "Mark the user's morning and/or evening routine as completed for a date (defaults to today). Use when the user reports they did their routine.",
      parameters: {
        type: 'object',
        properties: {
          time: {
            type: 'string',
            enum: ['am', 'pm', 'both'],
            description: 'Which routine was completed: morning, evening, or both.',
          },
          date: {
            type: 'string',
            description: 'Date in YYYY-MM-DD format. Omit for today.',
          },
          skinFeeling: {
            type: 'integer',
            minimum: 1,
            maximum: 5,
            description: 'Optional 1-5 rating of how the skin feels.',
          },
          skinConditions: {
            type: 'array',
            items: {
              type: 'string',
              enum: [
                'irritation',
                'dryness',
                'redness',
                'breakout',
                'glow',
                'smoothness',
                'oily',
                'tight',
              ],
            },
            description: 'Optional list of skin conditions the user mentioned.',
          },
          notes: { type: 'string', description: 'Optional free-text note for the log.' },
        },
        required: ['time'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_product',
      description:
        "Add a new product to the user's product library. Use when the user wants to add a product they own or one you recommended and they accepted.",
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Product name.' },
          brand: { type: 'string', description: 'Brand name.' },
          category: { type: 'string', enum: [...VALID_CATEGORIES] },
          routineTime: {
            type: 'string',
            enum: ['am', 'pm', 'both'],
            description: 'When the product is used.',
          },
          status: {
            type: 'string',
            enum: [...VALID_STATUS],
            description: "Ownership status. Use 'have' if they own it, 'need_to_buy' for a recommendation to purchase.",
          },
          rating: { type: 'integer', minimum: 1, maximum: 5, description: 'Optional 1-5 personal rating.' },
          inventoryLevel: {
            type: 'string',
            enum: ['new', 'medium', 'low', 'empty'],
            description: 'Optional how much is left.',
          },
          tags: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['core', 'occasional', 'finish_first', 'buy_next', 'monitor', 'replace_when_empty'],
            },
            description: 'Optional lifecycle / purchase-basket tags.',
          },
          notes: { type: 'string' },
        },
        required: ['name', 'category'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_product',
      description:
        "Update an existing product's status, rating, inventory level, tags, notes, active flag, or time of use. Identify the product by its id (preferred) or its name.",
      parameters: {
        type: 'object',
        properties: {
          productId: { type: 'string', description: 'The product id from the snapshot.' },
          productName: { type: 'string', description: 'Product name, if the id is unknown.' },
          status: { type: 'string', enum: [...VALID_STATUS] },
          rating: { type: 'integer', minimum: 1, maximum: 5 },
          inventoryLevel: { type: 'string', enum: ['new', 'medium', 'low', 'empty'] },
          tags: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['core', 'occasional', 'finish_first', 'buy_next', 'monitor', 'replace_when_empty'],
            },
          },
          routineTime: { type: 'string', enum: ['am', 'pm', 'both'] },
          isActive: { type: 'boolean' },
          notes: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_routine_step',
      description:
        "Add a step to the user's morning (am) or evening (pm) routine. Optionally attach a product the user already owns by name. If no matching product is found the step is added empty and you should offer to add a product for it.",
      parameters: {
        type: 'object',
        properties: {
          time: { type: 'string', enum: ['am', 'pm'] },
          category: { type: 'string', enum: [...VALID_CATEGORIES] },
          productName: {
            type: 'string',
            description: 'Name of a product the user owns to attach to this step. Optional.',
          },
        },
        required: ['time', 'category'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'advance_rotation',
      description:
        "Advance the night rotation to the next protocol. Use after the user finishes tonight's rotation night, or when they ask to move to the next night.",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_journal_entry',
      description:
        'Record a journal entry — a dated milestone or event in the user\'s skincare journey (e.g. "started a new serum", "trip to Athens, skin stayed stable").',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Short title.' },
          body: { type: 'string', description: 'What happened.' },
          entryDate: { type: 'string', description: 'YYYY-MM-DD. Omit for today.' },
          tags: { type: 'array', items: { type: 'string' } },
        },
        required: ['body'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'log_decision',
      description:
        'Record a skincare DECISION with its reason (e.g. "AESTURA becomes the primary night moisturizer"). Decisions are permanent records.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'The decision, one line.' },
          body: { type: 'string', description: 'The reason / rationale.' },
          status: {
            type: 'string',
            enum: ['active', 'permanent', 'superseded'],
            description: "Defaults to 'active'. Use 'permanent' for guiding principles.",
          },
          entryDate: { type: 'string', description: 'YYYY-MM-DD. Omit for today.' },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'record_insight',
      description:
        'Capture an INSIGHT — something learned about the user\'s skin (e.g. "barrier health comes before adding actives", "heat triggers temporary redness").',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Short title.' },
          body: { type: 'string', description: 'The insight.' },
          tags: { type: 'array', items: { type: 'string' } },
        },
        required: ['body'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_current_state',
      description:
        "Update the user's living Current-State snapshot. Only pass the fields that changed — they are merged into the existing snapshot.",
      parameters: {
        type: 'object',
        properties: {
          skinScore: { type: 'number', minimum: 0, maximum: 10 },
          barrier: { type: 'string' },
          hydration: { type: 'string' },
          redness: { type: 'string' },
          breakouts: { type: 'string' },
          eyes: { type: 'string' },
          lips: { type: 'string' },
          cyclePhase: { type: 'string' },
          currentPriorities: { type: 'array', items: { type: 'string' } },
          openFollowups: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
];

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY not set' }, { status: 500 });
    }

    const { messages, context } = (await request.json()) as {
      messages?: Array<Record<string, unknown>>;
      context?: unknown;
    };

    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 });
    }

    // Strip any client-only display metadata (fields prefixed with "_").
    const cleanMessages = messages.map((m) => {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(m)) {
        if (k.startsWith('_')) continue;
        out[k] = v;
      }
      return out;
    });

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: systemPrompt(context) }, ...cleanMessages],
        tools: TOOLS,
        tool_choice: 'auto',
        max_tokens: 1200,
        temperature: 0.5,
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
      choices: Array<{ message: Record<string, unknown> }>;
    };
    const message = data.choices[0]?.message ?? { role: 'assistant', content: '' };

    return NextResponse.json({ message });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Agent request failed' },
      { status: 500 }
    );
  }
}
