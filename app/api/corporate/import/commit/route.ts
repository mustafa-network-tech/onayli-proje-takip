import { requireUser } from "@/lib/auth";
import { commitCorporateImport, corporateCommitSchema } from "@/lib/corporate";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const input = corporateCommitSchema.parse(await request.json());
    const id = await commitCorporateImport(input, user.id);
    return Response.json({ ok: true, id, projects: input.rows.length });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Excel kaydedilemedi." }, { status: 400 }); }
}
