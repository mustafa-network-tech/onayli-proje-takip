import { getCloudflareContext } from "@opennextjs/cloudflare";
import { db } from "./db";
import type { SqlCommand } from "./monthly-hp-sql";

export async function executeSqlBatch(commands: SqlCommand[]) {
  if (process.env.NODE_ENV === "development") {
    return db.$transaction(async tx => {
      for (const command of commands) await tx.$executeRawUnsafe(command.sql, ...command.values);
    });
  }
  const { env } = getCloudflareContext();
  await env.DB.batch(commands.map(command => env.DB.prepare(command.sql).bind(...command.values)));
}
