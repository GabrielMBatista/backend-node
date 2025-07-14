// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";

// Força carregar o .env no momento em que o Prisma é instanciado
if (!process.env.DATABASE_URL) {
  require("dotenv").config();
}

export function getPrismaClient() {
  return new PrismaClient().$extends(withAccelerate());
}
