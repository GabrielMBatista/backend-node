import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

router.get("/api/categories", async (req, res) => {
  console.log("[GET] /api/categories → Iniciando requisição");

  const { interviewTypeId, page = 1, limit = 10, search } = req.query;
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
    const skip = (Number(page) - 1) * Number(limit);

    const categories = await prisma.category.findMany({
      where: {
        interviewTypeId,
        ...(typeof search === "string" ? { name: { contains: search as string, mode: "insensitive" } } : {}),
      },
      include: {
        questions: {
          select: {
            questionId: true,
          },
        },
      },
      skip,
      take: Number(limit),
    });

    const total = await prisma.category.count({
      where: {
        interviewTypeId,
        ...(typeof search === "string" ? { name: { contains: search as string, mode: "insensitive" } } : {}),
      },
    });

    const categoriesWithQuestionData = categories.map((category) => ({
      id: category.id,
      name: category.name,
      interviewTypeId: category.interviewTypeId,
      questionCount: category.questions.length,
      questionIds: category.questions.map((q) => q.questionId),
    }));

    console.log(
      `[GET] /api/categories → ${categories.length} categorias encontradas`
    );
    res.json({
      data: categoriesWithQuestionData,
      total,
      page: Number(page),
      limit: Number(limit),
    });
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

// Rota para vincular perguntas a uma categoria
router.post("/api/categories/:categoryId/questions", async (req, res) => {
  console.log(
    "[POST] /api/categories/:categoryId/questions → Iniciando vinculação de perguntas à categoria"
  );

  const { categoryId } = req.params;
  const { questionIds } = req.body;

  if (!Array.isArray(questionIds) || questionIds.length === 0) {
    console.error(
      "[POST] /api/categories/:categoryId/questions → questionIds ausente ou inválido"
    );
    return res
      .status(400)
      .json({ error: "O campo 'questionIds' deve ser um array não vazio." });
  }

  try {
    const lastQuestionInCategory = await prisma.questionInCategory.findFirst({
      where: { categoryId },
      orderBy: { order: "desc" },
    });

    let nextOrder = lastQuestionInCategory
      ? lastQuestionInCategory.order + 1
      : 1;

    const dataToInsert = questionIds.map((questionId) => ({
      categoryId,
      questionId,
      order: nextOrder++,
    }));

    await prisma.questionInCategory.createMany({
      data: dataToInsert,
    });

    console.log(
      "[POST] /api/categories/:categoryId/questions → Perguntas vinculadas à categoria com sucesso"
    );
    res
      .status(201)
      .json({ message: "Perguntas vinculadas à categoria com sucesso." });
  } catch (error) {
    console.error(
      "[POST] /api/categories/:categoryId/questions → Erro ao vincular perguntas à categoria:",
      error
    );
    res.status(500).json({ error: "Erro ao vincular perguntas à categoria." });
  }
});

router.delete(
  "/api/categories/:categoryId/questions/:questionId",
  async (req, res) => {
    console.log(
      "[DELETE] /api/categories/:categoryId/questions/:questionId → Iniciando remoção de vínculo"
    );

    const { categoryId, questionId } = req.params;

    try {
      const deletedLink = await prisma.questionInCategory.deleteMany({
        where: {
          categoryId,
          questionId,
        },
      });

      if (deletedLink.count === 0) {
        console.error(
          "[DELETE] /api/categories/:categoryId/questions/:questionId → Vínculo não encontrado"
        );
        return res
          .status(404)
          .json({ error: "Vínculo não encontrado para exclusão." });
      }

      console.log(
        "[DELETE] /api/categories/:categoryId/questions/:questionId → Vínculo removido com sucesso"
      );
      res.status(200).json({ message: "Vínculo removido com sucesso." });
    } catch (error) {
      console.error(
        "[DELETE] /api/categories/:categoryId/questions/:questionId → Erro ao remover vínculo:",
        error
      );
      res.status(500).json({ error: "Erro ao remover vínculo." });
    }
  }
);

router.delete("/api/categories/:id", async (req, res) => {
  console.log("[DELETE] /api/categories/:id → Iniciando exclusão de categoria");

  const { id } = req.params;

  try {
    // Verificar se a categoria possui perguntas vinculadas
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        questions: true,
      },
    });

    if (!category) {
      console.error("[DELETE] /api/categories/:id → Categoria não encontrada");
      return res.status(404).json({ error: "Categoria não encontrada." });
    }

    if (category.questions.length > 0) {
      console.error(
        "[DELETE] /api/categories/:id → Categoria possui perguntas vinculadas"
      );
      return res.status(400).json({
        error:
          "A categoria não pode ser deletada porque possui perguntas vinculadas.",
      });
    }

    // Excluir a categoria
    await prisma.category.delete({
      where: { id },
    });

    console.log(
      "[DELETE] /api/categories/:id → Categoria deletada com sucesso"
    );
    res.status(200).json({ message: "Categoria deletada com sucesso." });
  } catch (error) {
    console.error(
      "[DELETE] /api/categories/:id → Erro ao deletar categoria:",
      error
    );
    res.status(500).json({ error: "Erro ao deletar categoria." });
  }
});

export default router;
