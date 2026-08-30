import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
await prisma.user.upsert({ where: { email: "operator@local.test" }, update: {}, create: { name: "Saha Operatörü", email: "operator@local.test" } });
await prisma.$disconnect();
