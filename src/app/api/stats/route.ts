import { motionForDay } from "@/lib/game";
import { store } from "@/lib/store";
import { errorResponse } from "../_respond";

// ?day=N for an archive day; today by default.
export async function GET(req: Request) {
  try {
    const raw = new URL(req.url).searchParams.get("day");
    const motion = await motionForDay(raw ? Number(raw) : undefined);
    return Response.json(await store().stats(motion.id));
  } catch (err) {
    return errorResponse(err);
  }
}
