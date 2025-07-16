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

router.post("/api/questions", async (req, res) => {
  console.log("[POST] /api/questions → Iniciando criação de pergunta");

  const { text, difficulty } = req.body;

  if (!text || !difficulty) {
    console.error("[POST] /api/questions → Dados inválidos");
    return res
      .status(400)
      .json({ error: "Os campos 'text' e 'difficulty' são obrigatórios." });
  }

  try {
    const question = await prisma.question.create({
      data: { ...(text && { text }), ...(difficulty && { difficulty }) },
    });
    console.log(
      "[POST] /api/questions → Pergunta criada com sucesso:",
      question
    );
    res.status(201).json(question);
  } catch (error) {
    console.error("[POST] /api/questions → Erro ao criar pergunta:", error);
    res.status(500).json({ error: "Erro ao criar pergunta." });
  }
});

router.put("/api/questions/:id", async (req, res) => {
  console.log("[PUT] /api/questions/:id → Iniciando atualização de pergunta");

  const { id } = req.params;
  const { content, difficulty } = req.body;

  if (!content && !difficulty) {
    console.error("[PUT] /api/questions/:id → Nenhum campo para atualizar");
    return res.status(400).json({
      error:
        "Ao menos um dos campos 'text' ou 'difficulty' deve ser fornecido.",
    });
  }

  try {
    const question = await prisma.question.update({
      where: { id },
      data: { ...(content && { content }), ...(difficulty && { difficulty }) },
    });
    console.log(
      "[PUT] /api/questions/:id → Pergunta atualizada com sucesso:",
      question
    );
    res.json(question);
  } catch (error) {
    console.error(
      "[PUT] /api/questions/:id → Erro ao atualizar pergunta:",
      error
    );
    res.status(500).json({ error: "Erro ao atualizar pergunta." });
  }
});

export default router;
