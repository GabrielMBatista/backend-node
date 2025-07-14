import { Router } from "express";
import { getPrismaClient } from "../../../lib/prisma";
const prisma = getPrismaClient();

const router = Router();

router.post("/api/sessions/:id/finish", async (req, res) => {
  console.log("[POST] /api/sessions/:id/finish → Iniciando requisição");

  const { id } = req.params;
  const { summary, fullReport, score } = req.body;

  if (!summary || !fullReport || score === undefined) {
    console.error(
      "[POST] /api/sessions/:id/finish → Campos obrigatórios ausentes"
    );
    return res.status(400).json({ error: "Todos os campos são obrigatórios." });
  }

  try {
    const session = await prisma.interviewSession.update({
      where: { id },
      data: { summary, fullReport, score, completedAt: new Date() },
    });
    console.log(
      "[POST] /api/sessions/:id/finish → Sessão finalizada com sucesso"
    );
    res.json(session);
  } catch (error) {
    console.error(
      "[POST] /api/sessions/:id/finish → Erro ao finalizar sessão:",
      error
    );
    res.status(500).json({ error: "Erro ao finalizar sessão." });
  }
});

export default router;
