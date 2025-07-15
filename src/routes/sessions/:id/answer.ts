import { Router } from "express";
import { getPrismaClient } from "../../../lib/prisma";
const prisma = getPrismaClient();

const router = Router();

router.post("/api/answers", async (req, res) => {
  console.log("[POST] /api/answers → Iniciando requisição");

  const { sessionId, questionId, transcript, audioUrl, score } = req.body;

  if (!sessionId || !questionId || !audioUrl || score === undefined) {
    console.error("[POST] /api/answers → Campos obrigatórios ausentes");
    return res.status(400).json({ error: "Todos os campos são obrigatórios." });
  }

  try {
    const answer = await prisma.answer.create({
      data: {
        sessionId,
        questionId,
        transcript: transcript || "Default transcript",
        audioUrl,
        score,
        analysis: "Default analysis",
      },
    });
    console.log("[POST] /api/answers → Resposta salva com sucesso");
    res.status(201).json(answer);
  } catch (error) {
    console.error("[POST] /api/answers → Erro ao salvar resposta:", error);
    res.status(500).json({ error: "Erro ao salvar resposta." });
  }
});

export default router;
