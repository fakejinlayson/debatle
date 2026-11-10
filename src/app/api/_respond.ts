import "server-only";
import { GameError } from "@/lib/game";
import { ClaudeRefusal } from "@/lib/claude";
import { RoundConflict } from "@/lib/store";

export { publicGame } from "@/lib/game";

export function errorResponse(err: unknown): Response {
  if (err instanceof GameError) return Response.json({ error: err.message }, { status: err.status });
  if (err instanceof RoundConflict) return Response.json({ error: err.message }, { status: 409 });
  if (err instanceof ClaudeRefusal)
    return Response.json({ error: "The chamber refused to hear that one. Try another argument." }, { status: 422 });
  console.error(err);
  return Response.json({ error: "Something went wrong in the chamber" }, { status: 500 });
}
