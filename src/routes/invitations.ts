import { Router } from "express";
import { getPrismaClient } from "../lib/prisma";
const prisma = getPrismaClient();

const router = Router();

// Rota para criar um novo convite
router.post("/api/invitations", async (req, res) => {
  console.log("[POST] /api/invitations → Iniciando requisição");

  const { candidateName, candidateEmail, categoryId } = req.body;

  if (!candidateName || !candidateEmail || !categoryId) {
    console.error("[POST] /api/invitations → Campos obrigatórios ausentes");
    return res.status(400).json({ error: "Todos os campos são obrigatórios." });
  }

  try {
    const invitation = await prisma.interviewInvitation.create({
      data: { candidateName, candidateEmail, categoryId },
    });
    console.log("[POST] /api/invitations → Convite criado com sucesso");
    res.status(201).json(invitation);
  } catch (error) {
    console.error("[POST] /api/invitations → Erro ao criar convite:", error);
    res.status(500).json({ error: "Erro ao criar convite." });
  }
});

// Rota para buscar um convite específico por ID
router.get("/api/invitations/:id", async (req, res) => {
  console.log("[GET] /api/invitations/:id → Iniciando requisição");

  const { id } = req.params;

  try {
    const invitation = await prisma.interviewInvitation.findUnique({
      where: { id },
      include: {
        category: {
          include: {
            questions: {
              include: { question: true },
            },
          },
        },
      },
    });

    if (!invitation) {
      console.error("[GET] /api/invitations/:id → Convite não encontrado");
      return res.status(404).json({ error: "Convite não encontrado." });
    }

    const questions = invitation.category.questions.map((q) => q.question);

    console.log("[GET] /api/invitations/:id → Convite encontrado com sucesso");
    res.json({
      ...invitation,
      questions, // Adicionar perguntas diretamente ao objeto
    });
  } catch (error) {
    console.error(
      "[GET] /api/invitations/:id → Erro ao buscar convite:",
      error
    );
    res.status(500).json({ error: "Erro ao buscar convite." });
  }
});

export default router;
