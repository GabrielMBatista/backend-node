import { Router } from "express";
import { getPrismaClient } from "../lib/prisma";
const prisma = getPrismaClient();

const router = Router();

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
    res.json({ id: invitation.id });
  } catch (error) {
    console.error("[POST] /api/invitations → Erro ao criar convite:", error);
    res.status(500).json({ error: "Erro ao criar convite." });
  }
});

export default router;
