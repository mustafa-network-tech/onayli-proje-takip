export type SqlCommand = { sql: string; values: (string | number | null)[] };

// The snapshot has no foreign key to imported data: replacing an Excel must
// not rewrite historical HP/address totals. Its identity survives reimports.
export function completionCapture(source: "import" | "panel", targetId: string): SqlCommand {
  const month = source === "panel" ? "strftime('%Y-%m', 'now', '+3 hours')"
    : "strftime('%Y-%m', 'now', '+3 hours', 'start of month', '-1 month')";
  return {
    sql: `INSERT INTO "HpMonthlyCompletion"
      ("id","projectId","projectType","sourceKey","uavt","district","neighborhood","street","buildingName","doorNumber","hp","month","origin")
      SELECT lower(hex(randomblob(16))),p."projectId",p."projectType",b."sourceKey",b."uavt",
        b."district",b."neighborhood",b."street",b."buildingName",b."doorNumber",b."bbkHp",${month},?
      FROM "HpBuilding" b JOIN "HpProject" p ON p."id"=b."projectRefId"
      WHERE ${source === "panel" ? 'b."id"' : 'p."lastImportId"'}=?
        AND b."isActive"=1 AND b."cableCompleted"=1 AND b."spliceCompleted"=1
        AND (p."projectType"='GF' OR (p."projectType"='BF' AND b."ibkCompleted"=1))
      ON CONFLICT("projectType","projectId","sourceKey") DO NOTHING`,
    values: [source, targetId],
  };
}
