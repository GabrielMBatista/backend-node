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

router.post("/api/categories", async (req, res) => {
  console.log("[POST] /api/categories → Iniciando criação de categoria");

  const { name, interviewTypeId } = req.body;

  if (!name || !interviewTypeId) {
    console.error("[POST] /api/categories → Dados inválidos");
    return res.status(400).json({
      error: "Os campos 'name' e 'interviewTypeId' são obrigatórios.",
    });
  }

  try {
    const category = await prisma.category.create({
      data: { name, interviewTypeId },
    });
    console.log(
      "[POST] /api/categories → Categoria criada com sucesso:",
      category
    );
    res.status(201).json(category);
  } catch (error) {
    console.error("[POST] /api/categories → Erro ao criar categoria:", error);
    res.status(500).json({ error: "Erro ao criar categoria." });
  }
});

router.put("/api/categories/:id", async (req, res) => {
  console.log("[PUT] /api/categories/:id → Iniciando atualização de categoria");

  const { id } = req.params;
  const { name, interviewTypeId } = req.body;

  if (!name && !interviewTypeId) {
    console.error("[PUT] /api/categories/:id → Nenhum campo para atualizar");
    return res.status(400).json({
      error:
        "Ao menos um dos campos 'name' ou 'interviewTypeId' deve ser fornecido.",
    });
  }

  try {
    const category = await prisma.category.update({
      where: { id },
      data: { name, interviewTypeId },
    });
    console.log(
      "[PUT] /api/categories/:id → Categoria atualizada com sucesso:",
      category
    );
    res.json(category);
  } catch (error) {
    console.error(
      "[PUT] /api/categories/:id → Erro ao atualizar categoria:",
      error
    );
    res.status(500).json({ error: "Erro ao atualizar categoria." });
  }
});

router.post("/api/categories/:categoryId/questions", async (req, res) => {
  console.log(
    "[POST] /api/categories/:categoryId/questions → Iniciando vinculação de pergunta à categoria"
  );

  const { categoryId } = req.params;
  const { questionId } = req.body;

  if (!questionId) {
    console.error(
      "[POST] /api/categories/:categoryId/questions → questionId ausente"
    );
    return res
      .status(400)
      .json({ error: "O campo 'questionId' é obrigatório." });
  }

  try {
    const lastQuestionInCategory = await prisma.questionInCategory.findFirst({
      where: { categoryId },
      orderBy: { order: "desc" },
    });

    const nextOrder = lastQuestionInCategory
      ? lastQuestionInCategory.order + 1
      : 1;

    await prisma.questionInCategory.create({
      data: { categoryId, questionId, order: nextOrder },
    });
    console.log(
      "[POST] /api/categories/:categoryId/questions → Pergunta vinculada à categoria com sucesso"
    );
    res
      .status(201)
      .json({ message: "Pergunta vinculada à categoria com sucesso." });
  } catch (error) {
    console.error(
      "[POST] /api/categories/:categoryId/questions → Erro ao vincular pergunta à categoria:",
      error
    );
    res.status(500).json({ error: "Erro ao vincular pergunta à categoria." });
  }
});

export default router;
