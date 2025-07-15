import { Router } from "express";
import { getPrismaClient } from "../lib/prisma";
const prisma = getPrismaClient();

const router = Router();

router.post("/api/sessions/start", async (req, res) => {
  console.log("[POST] /api/sessions/start → Iniciando requisição");

  const { invitationId, startTime } = req.body;

  if (!invitationId || !startTime) {
    console.error("[POST] /api/sessions/start → Campos obrigatórios ausentes");
    return res.status(400).json({ error: "Todos os campos são obrigatórios." });
  }

  try {
    let session = await prisma.interviewSession.findUnique({
      where: { invitationId },
    });

    if (session) {
      console.log(
        "[POST] /api/sessions/start → Sessão existente encontrada, retomando..."
      );
      return res.status(200).json(session); // Retornar sessão existente
    }

    session = await prisma.interviewSession.create({
      data: {
        invitationId,
        startTime,
      },
    });
    console.log("[POST] /api/sessions/start → Nova sessão criada com sucesso");
    res.status(201).json(session);
  } catch (error) {
    console.error(
      "[POST] /api/sessions/start → Erro ao criar ou buscar sessão:",
      error
    );
    res.status(500).json({ error: "Erro ao criar ou buscar sessão." });
  }
});

export default router;
