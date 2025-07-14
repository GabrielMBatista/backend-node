import { Router } from "express";
import { getPrismaClient } from "../../lib/prisma";
const prisma = getPrismaClient();

const router = Router();

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

    console.log("[GET] /api/invitations/:id → Convite encontrado com sucesso");
    res.json(invitation);
  } catch (error) {
    console.error(
      "[GET] /api/invitations/:id → Erro ao buscar convite:",
      error
    );
    res.status(500).json({ error: "Erro ao buscar convite." });
  }
});

export default router;
