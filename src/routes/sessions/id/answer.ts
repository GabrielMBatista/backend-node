import { Router } from "express";
import { getPrismaClient } from "../../../lib/prisma";
const prisma = getPrismaClient();

const router = Router();

router.post("/api/sessions/:id/answer", async (req, res) => {
  console.log("[POST] /api/sessions/:id/answer → Iniciando requisição");

  const { id } = req.params;
  const { questionId, transcript, audioUrl, score } = req.body;

  if (!questionId || !transcript || !audioUrl || score === undefined) {
    console.error(
      "[POST] /api/sessions/:id/answer → Campos obrigatórios ausentes"
    );
    return res.status(400).json({ error: "Todos os campos são obrigatórios." });
  }

  try {
    const answer = await prisma.answer.create({
      data: {
        sessionId: id,
        questionId,
        transcript,
        audioUrl,
        score,
        analysis: "Default analysis",
      },
    });
    console.log("[POST] /api/sessions/:id/answer → Resposta salva com sucesso");
    res.json(answer);
  } catch (error) {
    console.error(
      "[POST] /api/sessions/:id/answer → Erro ao salvar resposta:",
      error
    );
    res.status(500).json({ error: "Erro ao salvar resposta." });
  }
});

export default router;
