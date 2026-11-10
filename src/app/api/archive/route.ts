import { archiveList } from "@/lib/archive";
import { errorResponse } from "../_respond";

// Past days with this player's status on each, plus their archive access.
export async function GET() {
  try {
    return Response.json(await archiveList());
  } catch (err) {
    return errorResponse(err);
  }
}
