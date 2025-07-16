import { Router } from "express";
import { getPrismaClient } from "../lib/prisma";
import {
  evaluateSessionWithOpenAI,
  parseEvaluationResult,
} from "../lib/openai"; // Importa função utilitária
import { evaluationQueue } from "../lib/localQueue";
import { getCompletedSessions } from "../controllers/sessionsController";

const prisma = getPrismaClient();

const router = Router();

// Rota para iniciar uma sessão
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

// Rota para finalizar uma sessão
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
      "[POST] /api/sessions/:id/finish → Sessão finalizada com sucesso",
      session
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

// Rota para salvar uma resposta
router.post("/api/sessions/:id/answer", async (req, res) => {
  console.log("[POST] /api/sessions/:id/answer → Iniciando requisição");

  const sessionId = req.params.id;
  const { questionId, transcript, audioBlob } = req.body; // Removido audioUrl
  console.log("req.body", req.body);
  if (!sessionId || !questionId || !transcript) {
    console.error(
      "[POST] /api/sessions/:id/answer → Campos obrigatórios ausentes"
    );
    return res.status(400).json({
      error: "Campos obrigatórios: sessionId, questionId e transcript.",
    });
  }

  try {
    const answer = await prisma.answer.create({
      data: {
        sessionId,
        questionId,
        transcript,
        audioBlob: audioBlob,
        analysis: "Default analysis",
      },
    });
    console.log("[POST] /api/sessions/:id/answer → Resposta salva com sucesso");
    res.status(201).json(answer);
  } catch (error) {
    console.error(
      "[POST] /api/sessions/:id/answer → Erro ao salvar resposta:",
      error
    );
    res.status(500).json({ error: "Erro ao salvar resposta." });
  }
});

// Rota para obter resumo de perguntas e respostas
router.get("/api/sessions/:id/summary", async (req, res) => {
  console.log("[GET] /api/sessions/:id/summary → Iniciando requisição");

  const { id } = req.params;

  try {
    const session = await prisma.interviewSession.findUnique({
      where: { id },
      include: {
        answers: {
          include: {
            question: true, // Inclui detalhes da pergunta
          },
        },
      },
    });

    if (!session) {
      console.error("[GET] /api/sessions/:id/summary → Sessão não encontrada");
      return res.status(404).json({ error: "Sessão não encontrada." });
    }

    console.log("[GET] /api/sessions/:id/summary → Resumo obtido com sucesso");
    res.json(session);
  } catch (error) {
    console.error(
      "[GET] /api/sessions/:id/summary → Erro ao obter resumo:",
      error
    );
    res.status(500).json({ error: "Erro ao obter resumo." });
  }
});

// Rota para editar transcrição de uma resposta
router.put("/api/sessions/:sessionId/answers/:answerId", async (req, res) => {
  console.log(
    "[PUT] /api/sessions/:sessionId/answers/:answerId → Iniciando requisição"
  );

  const { sessionId, answerId } = req.params;
  const { transcript } = req.body;

  if (!transcript) {
    console.error(
      "[PUT] /api/sessions/:sessionId/answers/:answerId → Campo obrigatório ausente"
    );
    return res
      .status(400)
      .json({ error: "O campo 'transcript' é obrigatório." });
  }

  try {
    const answer = await prisma.answer.update({
      where: { id: answerId },
      data: { transcript },
    });

    console.log(
      "[PUT] /api/sessions/:sessionId/answers/:answerId → Transcrição atualizada com sucesso"
    );
    res.json(answer);
  } catch (error) {
    console.error(
      "[PUT] /api/sessions/:sessionId/answers/:answerId → Erro ao atualizar transcrição:",
      error
    );
    res.status(500).json({ error: "Erro ao atualizar transcrição." });
  }
});

// Rota para finalizar sessão e enviar para fila de avaliação
router.post("/api/sessions/:id/evaluate", async (req, res) => {
  console.log("[POST] /api/sessions/:id/evaluate → Iniciando requisição");

  const { id } = req.params;

  try {
    const session = await prisma.interviewSession.findUnique({
      where: { id },
    });

    if (!session) {
      console.error(
        "[POST] /api/sessions/:id/evaluate → Sessão não encontrada"
      );
      return res.status(404).json({ error: "Sessão não encontrada." });
    }

    if (!session.completedAt) {
      console.log(
        "[POST] /api/sessions/:id/evaluate → Finalizando sessão automaticamente"
      );

      await prisma.interviewSession.update({
        where: { id },
        data: { completedAt: new Date() },
      });
    }

    // Adicionar tarefa à fila local
    evaluationQueue.enqueue(async () => {
      console.log(`[Fila local] → Processando avaliação para sessão: ${id}`);

      const sessionWithAnswers = await prisma.interviewSession.findUnique({
        where: { id },
        include: { answers: { include: { question: true } } }, // Certifique-se de incluir as perguntas
      });

      if (!sessionWithAnswers) {
        throw new Error(`Sessão não encontrada: ${id}`);
      }

      console.log(
        `[Fila local] → Dados da sessão enviados para avaliação:`,
        sessionWithAnswers.answers
      );

      const evaluationResult = await evaluateSessionWithOpenAI(
        sessionWithAnswers.answers
      );
      const [summary, fullReport, score] =
        parseEvaluationResult(evaluationResult);

      await prisma.interviewSession.update({
        where: { id },
        data: {
          summary,
          fullReport,
          score,
          evaluatedAt: new Date(),
        },
      });

      console.log(`[Fila local] → Avaliação concluída para sessão: ${id}`);
    });

    console.log(
      "[POST] /api/sessions/:id/evaluate → Sessão adicionada à fila local"
    );
    res.json({
      message: "Sessão adicionada à fila local.",
    });
  } catch (error) {
    console.error(
      "[POST] /api/sessions/:id/evaluate → Erro ao adicionar sessão à fila:",
      error
    );
    res.status(500).json({ error: "Erro ao adicionar sessão à fila." });
  }
});

// Rota para retornar uma lista de sessões concluídas com filtros por colunas e datas
router.get("/api/sessions/completed", async (req, res) => {
  try {
    const { startDate, endDate, columns } = req.query;

    // Validação dos parâmetros
    if (startDate && isNaN(Date.parse(startDate as string))) {
      return res.status(400).json({ error: "Data inicial inválida." });
    }
    if (endDate && isNaN(Date.parse(endDate as string))) {
      return res.status(400).json({ error: "Data final inválida." });
    }

    const sessions = await getCompletedSessions({
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      columns: columns ? (columns as string).split(",") : undefined,
    });

    res.json(sessions);
  } catch (error) {
    console.error(
      "[GET /api/sessions/completed] → Erro ao buscar sessões concluídas:",
      error
    );
    res.status(500).json({ error: "Erro ao buscar sessões concluídas." });
  }
});

export default router;
