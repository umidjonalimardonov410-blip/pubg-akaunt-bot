import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "./_core/trpc";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/responses";
const MODEL = "openai/gpt-6-astra";

const LANG_NAME = { uz: "Uzbek (Latin script)", ru: "Russian", en: "English" } as const;

export type ListingAdvice = {
  improvedDescription: string;
  missingInfo: string[];
  tips: string[];
};

function buildPrompt(lang: keyof typeof LANG_NAME, text: string, facts: Record<string, unknown>) {
  return [
    `You help sellers on a PUBG Mobile account marketplace write accurate, trustworthy listings.`,
    `Reply ONLY with a JSON object: {"improvedDescription": string, "missingInfo": string[], "tips": string[]}.`,
    `Write every value in ${LANG_NAME[lang]}.`,
    `improvedDescription: a clear, honest listing description (max ~900 characters). Use only facts from the seller text, the structured fields and what is clearly visible in the screenshots. Never invent numbers, skins or guarantees.`,
    `missingInfo: up to 6 short items buyers care about that are missing or unclear (e.g. linked accounts/binding, Conqueror seasons, rare skins list, UC, login method, region, account age).`,
    `tips: up to 3 short tips to make the listing sell faster and safer (escrow only, no off-platform payments).`,
    ``,
    `Structured fields: ${JSON.stringify(facts)}`,
    `Seller text: """${text.slice(0, 2000)}"""`,
  ].join("\n");
}

/** Streams the Responses API (SSE) and returns the final text. */
export async function callGateway(apiKey: string, prompt: string, images: string[]): Promise<string> {
  const content: any[] = [{ type: "input_text", text: prompt }];
  for (const url of images) content.push({ type: "input_image", image_url: url });

  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      store: false,
      reasoning: { effort: "low" },
      input: [{ role: "user", content }],
    }),
  });

  if (!response.ok || !response.body) {
    const body = await response.text().catch(() => "");
    let message = "AI yordamchisi hozir ishlamayapti. Keyinroq urinib ko‘ring.";
    if (response.status === 429) message = "So‘rovlar ko‘p. Bir daqiqadan keyin urinib ko‘ring.";
    if (response.status === 402) message = "AI kreditlari tugagan. Admin bilan bog‘laning.";
    console.error("[ListingAI] gateway error", response.status, body.slice(0, 300));
    throw new TRPCError({ code: response.status === 429 ? "TOO_MANY_REQUESTS" : "INTERNAL_SERVER_ERROR", message });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let index: number;
    while ((index = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const event = JSON.parse(data);
        if (event.type === "response.output_text.delta" && typeof event.delta === "string") text += event.delta;
        if (event.type === "error" || event.type === "response.failed") {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI javob bera olmadi. Qayta urinib ko‘ring." });
        }
      } catch (error) {
        if (error instanceof TRPCError) throw error;
      }
    }
  }
  return text;
}

export function parseAdvice(raw: string): ListingAdvice {
  const match = raw.match(/\{[\s\S]*\}/);
  let parsed: any = {};
  try { parsed = match ? JSON.parse(match[0]) : {}; } catch { parsed = {}; }
  const list = (value: unknown, max: number) =>
    Array.isArray(value) ? value.filter(item => typeof item === "string" && item.trim()).map(item => item.trim()).slice(0, max) : [];
  const improved = typeof parsed.improvedDescription === "string" ? parsed.improvedDescription.trim() : raw.trim();
  return {
    improvedDescription: improved.slice(0, 1000),
    missingInfo: list(parsed.missingInfo, 6),
    tips: list(parsed.tips, 3),
  };
}

export const listingAIRouter = router({
  improve: protectedProcedure
    .input(z.object({
      lang: z.enum(["uz", "ru", "en"]).default("uz"),
      text: z.string().max(4000),
      facts: z.record(z.string(), z.unknown()).default({}),
      images: z.array(z.string().max(2_500_000)).max(4).default([]),
    }))
    .mutation(async ({ input }) => {
      const apiKey = process.env.LOVABLE_API_KEY;
      if (!apiKey) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "AI yordamchisi sozlanmagan (LOVABLE_API_KEY yo‘q)." });
      }
      if (!input.text.trim() && input.images.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Avval tavsif yozing yoki rasm qo‘shing." });
      }
      const images = input.images.filter(url => url.startsWith("data:image/") || url.startsWith("https://"));
      const raw = await callGateway(apiKey, buildPrompt(input.lang, input.text, input.facts), images);
      return parseAdvice(raw);
    }),
});
