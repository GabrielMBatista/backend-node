import { Router } from "express";
import { getPrismaClient } from "../lib/prisma";

const prisma = getPrismaClient();
const router = Router();

router.get("/api/interview-types", async (req, res) => {
  console.log("[GET] /api/interview-types → Iniciando requisição");

  try {
    const interviewTypes = await prisma.interviewType.findMany();
    console.log(
      `[GET] /api/interview-types → ${interviewTypes.length} tipos encontrados`
    );

    res.json(interviewTypes);
  } catch (error) {
    console.error(
      "[GET] /api/interview-types → Erro ao buscar tipos de entrevista:",
      error
    );
    res.status(500).json({ error: "Erro ao buscar tipos de entrevista." });
  }
});

export default router;
