import { z } from "zod";
import { after } from "next/server";
import { playRound, prepareAiSpeech, publicGame, todaysMotion } from "@/lib/game";
import { readPlayerId } from "@/lib/player";
import type { GameState } from "@/lib/types";
import { errorResponse } from "../_respond";

// Opponent + judge calls can take a while.
export const maxDuration = 120;

const Body = z.object({ text: z.string() });

/**
 * Streams newline-delimited JSON so the UI can show both speeches while the
 * judge works:
 *   {"type":"speeches","round":1,"playerText":"…","aiText":"…"}
 *   {"type":"result","game":{…},"record":{…}}   or   {"type":"error","error":"…","status":500}
 */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Missing speech" }, { status: 400 });
  const playerId = await readPlayerId();
  if (!playerId) return Response.json({ error: "Pick a side first" }, { status: 409 });

  // Registered up front (inside the request scope); runs once the round is saved.
  let roundDone: (game: GameState | null) => void = () => {};
  const finished = new Promise<GameState | null>((r) => (roundDone = r));
  after(async () => {
    const game = await finished;
    // Write the AI's next speech while the player reads the result and writes theirs.
    if (game) await prepareAiSpeech(game, await todaysMotion());
  });

  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(enc.encode(JSON.stringify(obj) + "\n"));
      try {
        const { game, record } = await playRound(playerId, parsed.data.text, (speeches) =>
          send({ type: "speeches", ...speeches }),
        );
        send({ type: "result", game: publicGame(game), record });
        roundDone(game);
      } catch (err) {
        roundDone(null);
        const res = errorResponse(err);
        send({ type: "error", status: res.status, ...(await res.json()) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" },
  });
}
