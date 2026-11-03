// Interpretazione delle misure con l'IA (Claude). Solo prova: risponde soltanto al seriale DEMO2026.
// La chiave ANTHROPIC_API_KEY è un secret di Supabase (Edge Functions → Secrets): non sta mai nell'app.
import Anthropic from "npm:@anthropic-ai/sdk";

const ORIGINS = ["https://app.equistasi.com", "http://localhost:8765"];
const MAX_CHARS = 12000;

const SYSTEM = `Sei un assistente per fisioterapisti che usano l'app Equistasi Point.
Ricevi un riepilogo di misure fatte con i sensori e la fotocamera del telefono (equilibrio, postura, test a tempo, goniometro, scoliometro, dolore, test sportivi), spesso confrontate senza e con il dispositivo Equistasi (stimolazione meccanica focale per il sistema propriocettivo).
Scrivi in italiano, in modo chiaro e conciso, per un professionista sanitario:
1. Sintesi: cosa dicono le misure, in 3-5 frasi.
2. Senza e con Equistasi: dove c'è una differenza e quanto è grande; se le prove sono poche, dillo.
3. Punti da approfondire: valori fuori dall'atteso o asimmetrie, da verificare con la valutazione clinica.
4. Suggerimenti pratici per il prossimo controllo (quali test ripetere, in che condizioni).
Regole: sono stime indicative fatte con il telefono, non un'analisi medica. Non fare diagnosi, non nominare patologie che non sono nei dati, non promettere effetti del dispositivo. Ricorda in una riga finale che la valutazione resta del professionista. Usa titoletti brevi e frasi semplici, senza tabelle.`;

function cors(origin: string | null) {
  const o = origin && ORIGINS.includes(origin) ? origin : ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": o,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info",
    "Vary": "Origin",
  };
}

function reply(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(origin), "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
  if (req.method !== "POST") return reply({ error: "method" }, 405, origin);
  if (!origin || !ORIGINS.includes(origin)) return reply({ error: "origin" }, 403, origin);

  let body: { serial?: string; summary?: string };
  try { body = await req.json(); } catch { return reply({ error: "json" }, 400, origin); }
  const serial = String(body.serial || "").trim().toUpperCase();
  const summary = String(body.summary || "").slice(0, MAX_CHARS);
  if (serial !== "DEMO2026") return reply({ error: "notallowed" }, 403, origin);
  if (summary.trim().length < 20) return reply({ error: "nodata" }, 400, origin);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return reply({ error: "nokey" }, 503, origin);
  const client = new Anthropic({ apiKey });

  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages: [{ role: "user", content: "Misure del paziente (riepilogo dall'app):\n\n" + summary }],
    } as any);
    if (response.stop_reason === "refusal") return reply({ error: "refusal" }, 422, origin);
    let text = "";
    for (const block of response.content) if (block.type === "text") text += block.text;
    if (!text.trim()) return reply({ error: "empty" }, 502, origin);
    return reply({ text }, 200, origin);
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return reply({ error: "busy" }, 429, origin);
    if (error instanceof Anthropic.AuthenticationError) return reply({ error: "nokey" }, 503, origin);
    if (error instanceof Anthropic.APIError) return reply({ error: "api", status: error.status }, 502, origin);
    return reply({ error: "other" }, 500, origin);
  }
});
