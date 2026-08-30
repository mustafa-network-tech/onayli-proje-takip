import { getCloudflareContext } from "@opennextjs/cloudflare";
import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "@prisma/client";
import { cache } from "react";

const getDb = cache(() => {
  const { env } = getCloudflareContext();
  return new PrismaClient({ adapter: new PrismaD1(env.DB) });
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
