import { todaysMotion } from "@/lib/game";
import { store } from "@/lib/store";
import { errorResponse } from "../_respond";

export async function GET() {
  try {
    const motion = await todaysMotion();
    return Response.json(await store().stats(motion.id));
  } catch (err) {
    return errorResponse(err);
  }
}
