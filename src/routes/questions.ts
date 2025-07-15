import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

router.get("/api/questions", async (req, res) => {
  console.log("[GET] /api/questions → Iniciando requisição");

  const { categoryId } = req.query;

  if (!categoryId || typeof categoryId !== "string") {
    console.error("[GET] /api/questions → categoryId inválido ou ausente");
    return res
      .status(400)
      .json({ error: "categoryId é obrigatório e deve ser uma string." });
  }

  try {
    const questions = await prisma.question.findMany({
      where: {
        id: {
          in: (
            await prisma.questionInCategory.findMany({
              where: { categoryId },
              select: { questionId: true },
            })
          ).map((qic) => qic.questionId),
        },
      },
    });
    console.log(
      `[GET] /api/questions → ${questions.length} perguntas encontradas`
    );
    res.json(questions);
  } catch (error) {
    console.error("[GET] /api/questions → Erro ao buscar perguntas:", error);
    res.status(500).json({ error: "Erro ao buscar perguntas." });
  }
});

router.get("/api/questions/all", async (req, res) => {
  console.log("[GET] /api/questions/all → Iniciando requisição");

  try {
    const questions = await prisma.question.findMany();
    console.log(
      `[GET] /api/questions/all → ${questions.length} perguntas encontradas`
    );
    res.json(questions);
  } catch (error) {
    console.error(
      "[GET] /api/questions/all → Erro ao buscar todas as perguntas:",
      error
    );
    res.status(500).json({ error: "Erro ao buscar todas as perguntas." });
  }
});

export default router;
