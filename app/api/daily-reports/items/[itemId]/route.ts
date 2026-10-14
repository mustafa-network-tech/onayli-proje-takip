import { guarded, jsonBody } from "@/lib/daily-report-api";
import { deleteItem, updateItem } from "@/lib/daily-report";

export function PATCH(request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  return guarded(request, async () => {
    const { itemId } = await params;
    const body = await jsonBody(request);
    await updateItem(itemId, body.status, body.note);
    return Response.json({ ok: true });
  }, true);
}
export function DELETE(request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  return guarded(request, async () => {
    await deleteItem((await params).itemId);
    return Response.json({ ok: true });
  }, true);
}
