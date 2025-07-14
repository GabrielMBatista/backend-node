import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

router.get("/api/categories", async (req, res) => {
  console.log("[GET] /api/categories → Iniciando requisição");

  const { interviewTypeId } = req.query;
  console.log(
    "[GET] /api/categories → interviewTypeId recebido:",
    interviewTypeId
  );

  if (!interviewTypeId || typeof interviewTypeId !== "string") {
    console.error(
      "[GET] /api/categories → interviewTypeId inválido ou ausente"
    );
    return res
      .status(400)
      .json({ error: "interviewTypeId é obrigatório e deve ser uma string." });
  }

  try {
    const categories = await prisma.category.findMany({
      where: { interviewTypeId },
    });
    console.log(
      `[GET] /api/categories → ${categories.length} categorias encontradas`
    );
    res.json(categories);
  } catch (error) {
    console.error("[GET] /api/categories → Erro ao buscar categorias:", error);
    res.status(500).json({ error: "Erro ao buscar categorias." });
  }
});

export default router;
