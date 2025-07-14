import { Router } from "express";
import { getPrismaClient } from "../lib/prisma";
const prisma = getPrismaClient();

const router = Router();

router.post("/api/sessions/start", async (req, res) => {
  console.log("[POST] /api/sessions/start → Iniciando requisição");

  const { invitationId } = req.body;

  if (!invitationId) {
    console.error("[POST] /api/sessions/start → invitationId ausente");
    return res.status(400).json({ error: "invitationId é obrigatório." });
  }

  try {
    const session = await prisma.interviewSession.create({
      data: { invitationId },
    });
    console.log("[POST] /api/sessions/start → Sessão criada com sucesso");
    res.json(session);
  } catch (error) {
    console.error("[POST] /api/sessions/start → Erro ao criar sessão:", error);
    res.status(500).json({ error: "Erro ao criar sessão." });
  }
});

export default router;
