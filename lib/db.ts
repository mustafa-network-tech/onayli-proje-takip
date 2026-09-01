import { getCloudflareContext } from "@opennextjs/cloudflare";
import { PrismaD1 } from "@prisma/adapter-d1";
import type { PrismaClient } from "@prisma/client";
import { PrismaClient as PrismaD1Client } from "@prisma/client/wasm";
import { cache } from "react";

function createLocalClient(): PrismaClient {
  // These requires stay inside the development-only branch so the native
  // SQLite driver is not included in the Cloudflare Worker bundle.
  const { PrismaBetterSQLite3 } = require("@prisma/adapter-better-sqlite3") as typeof import("@prisma/adapter-better-sqlite3");
  const { PrismaClient: LocalPrismaClient } = require("@prisma/client") as typeof import("@prisma/client");
  const adapter = new PrismaBetterSQLite3({ url: "file:./prisma/dev.db" });
  return new LocalPrismaClient({ adapter });
}

const getDb = cache((): PrismaClient => {
  if (process.env.NODE_ENV === "development") return createLocalClient();
  const { env } = getCloudflareContext();
  return new PrismaD1Client({ adapter: new PrismaD1(env.DB) }) as unknown as PrismaClient;
});

// Mevcut sorgu çağrılarını korurken her Worker isteğinde o isteğe ait
// D1 bağlantısını kullanır. Proxy yalnızca metot erişimini yönlendirir;
// istek veya bağlantı durumunu global kapsamda saklamaz.
export const db = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getDb();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
