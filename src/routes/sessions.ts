import { Router } from "express";
import { Buffer } from "buffer";
import { getPrismaClient } from "../lib/prisma";
import {
  evaluateSessionWithOpenAI,
  parseEvaluationResult,
} from "../lib/openai"; // Importa função utilitária
import { evaluationQueue } from "../lib/localQueue";
import { getCompletedSessions } from "../controllers/sessionsController";
import multer from "multer";

const prisma = getPrismaClient();

const router = Router();
const upload = multer({
  fileFilter: (req, file, cb) => {
    if (file.fieldname !== "audio") {
      return cb(new Error("Campo de arquivo inesperado. Esperado: 'audio'"));
    }
    cb(null, true);
  },
});

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
router.post(
  "/api/sessions/:id/answer",
  upload.single("audio"),
  async (req, res) => {
    console.log("[POST] /api/sessions/:id/answer → Iniciando requisição");

    const sessionId = req.params.id;
    const { questionId, transcript } = req.body;
    const audioFile = req.file;

    if (!sessionId || !questionId || !transcript) {
      console.error(
        "[POST] /api/sessions/:id/answer → Campos obrigatórios ausentes"
      );
      return res.status(400).json({
        error:
          "Campos obrigatórios: sessionId, questionId, transcript e audio.",
      });
    }

    try {
      const answer = await prisma.answer.create({
        data: {
          sessionId,
          questionId,
          transcript,
          audioBlob: null, // Inicialmente nulo, será atualizado com o buffer do arquivo
          analysis: "Default analysis",
        },
      });
      console.log(
        "[POST] /api/sessions/:id/answer → Resposta salva com sucesso"
      );
      res.status(201).json(answer);
    } catch (error) {
      console.error(
        "[POST] /api/sessions/:id/answer → Erro ao salvar resposta:",
        error
      );
      res.status(500).json({ error: "Erro ao salvar resposta." });
    }
  }
);

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
      include: {
        invitation: {
          include: {
            category: true, // Inclui a categoria associada ao convite
          },
        },
      },
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
        include: { answers: { include: { question: true } } },
      });

      if (!sessionWithAnswers) {
        console.error(`[Fila local] → Sessão não encontrada: ${id}`);
        return; // Ensure the function resolves to void
      }

      console.log(
        `[Fila local] → Dados da sessão enviados para avaliação:`,
        sessionWithAnswers.answers
      );

      const session = await prisma.interviewSession.findUnique({
        where: { id },
        include: {
          invitation: {
            include: {
              category: true,
            },
          },
        },
      });

      if (!session) {
        console.error(`[Fila local] → Sessão não encontrada: ${id}`);
        return; // Ensure the function resolves to void
      }

      const evaluationResult = await evaluateSessionWithOpenAI(
        sessionWithAnswers.answers,
        session.invitation.category
      );

      if (!evaluationResult) {
        console.error("[POST] /api/sessions/:id/evaluate → Erro na avaliação");
        return; // Ensure the function resolves to void
      }

      const [summary, fullReport, score] =
        parseEvaluationResult(evaluationResult);

      if (!summary || !fullReport || score === undefined) {
        console.error(
          "[POST] /api/sessions/:id/evaluate → Erro ao processar resultado da avaliação"
        );
        return; // Ensure the function resolves to void
      }

      await prisma.interviewSession.update({
        where: { id },
        data: {
          summary,
          fullReport: JSON.stringify(fullReport), // Serializa o fullReport como string JSON
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

// Rota para reenviar uma avaliação
router.post("/api/sessions/:id/re-evaluate", async (req, res) => {
  console.log("[POST] /api/sessions/:id/re-evaluate → Iniciando requisição");

  const { id } = req.params;

  try {
    const sessionWithAnswers = await prisma.interviewSession.findUnique({
      where: { id },
      include: {
        answers: { include: { question: true } },
        invitation: {
          include: {
            category: true,
          },
        },
      },
    });

    if (!sessionWithAnswers) {
      console.error(
        "[POST] /api/sessions/:id/re-evaluate → Sessão não encontrada"
      );
      return res.status(404).json({ error: "Sessão não encontrada." });
    }

    console.log(
      "[POST] /api/sessions/:id/re-evaluate → Dados da sessão obtidos:",
      sessionWithAnswers.answers
    );

    const evaluationResult = await evaluateSessionWithOpenAI(
      sessionWithAnswers.answers,
      sessionWithAnswers.invitation.category
    );

    if (!evaluationResult) {
      console.error("[POST] /api/sessions/:id/re-evaluate → Erro na avaliação");
      throw new Error("Erro na avaliação com OpenAI.");
    }

    const [summary, fullReport, score] =
      parseEvaluationResult(evaluationResult);

    if (!summary || !fullReport || score === undefined) {
      console.error(
        "[POST] /api/sessions/:id/re-evaluate → Erro ao processar resultado da avaliação"
      );
      throw new Error("Erro ao processar resultado da avaliação.");
    }

    // Serializa o fullReport como string JSON
    const serializedFullReport = JSON.stringify(fullReport);

    const updatedSession = await prisma.interviewSession.update({
      where: { id },
      data: {
        summary,
        fullReport: serializedFullReport, // Envia como string JSON
        score,
        evaluatedAt: new Date(),
      },
    });

    console.log(
      "[POST] /api/sessions/:id/re-evaluate → Avaliação reenviada com sucesso"
    );
    res.json(updatedSession);
  } catch (error) {
    console.error(
      "[POST] /api/sessions/:id/re-evaluate → Erro ao reenviar avaliação:",
      error
    );
    res.status(500).json({ error: "Erro ao reenviar avaliação." });
  }
});

// Rota para retornar uma lista de sessões concluídas com filtros por colunas e datas
router.get("/api/sessions/completed", async (req, res) => {
  console.log("[GET] /api/sessions/completed → Iniciando requisição");

  const {
    startDate,
    endDate,
    page = 1,
    limit = 10,
    sortBy = "completedAt",
    sortOrder = "asc",
  } = req.query;

  try {
    const filters: any = {
      completedAt: {},
    };

    if (startDate && !isNaN(Date.parse(startDate as string))) {
      filters.completedAt.gte = new Date(startDate as string);
    }
    if (endDate && !isNaN(Date.parse(endDate as string))) {
      filters.completedAt.lte = new Date(endDate as string);
    }

    // Remover o filtro `completedAt` se estiver vazio
    if (Object.keys(filters.completedAt).length === 0) {
      delete filters.completedAt;
    }

    const sessions = await prisma.interviewSession.findMany({
      where: filters,
      include: {
        invitation: {
          select: {
            candidateName: true,
            category: {
              select: {
                name: true,
                interviewType: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        answers: {
          select: {
            question: {
              select: {
                content: true,
              },
            },
            transcript: true,
          },
        },
      },
    });

    // Realizar a ordenação manual para todos os dados antes da paginação
    const validSortFields = [
      "candidateName",
      "score",
      "completedAt",
      "category",
      "interviewType",
    ];
    const isValidSortField = validSortFields.includes(sortBy as string);

    const sortedSessions = isValidSortField
      ? sessions.sort((a, b) => {
          const fieldA =
            sortBy === "candidateName"
              ? a.invitation.candidateName
              : sortBy === "category"
              ? a.invitation.category.name
              : sortBy === "interviewType"
              ? a.invitation.category.interviewType.name
              : a[sortBy as keyof typeof a];
          const fieldB =
            sortBy === "candidateName"
              ? b.invitation.candidateName
              : sortBy === "category"
              ? b.invitation.category.name
              : sortBy === "interviewType"
              ? b.invitation.category.interviewType.name
              : b[sortBy as keyof typeof b];

          if ((fieldA ?? "") < (fieldB ?? ""))
            return sortOrder === "asc" ? -1 : 1;
          if ((fieldA ?? "") > (fieldB ?? ""))
            return sortOrder === "asc" ? 1 : -1;
          return 0;
        })
      : sessions;

    // Aplicar paginação após a ordenação
    const paginatedSessions = sortedSessions.slice(
      (Number(page) - 1) * Number(limit),
      Number(page) * Number(limit)
    );

    const formattedSessions = paginatedSessions.map((session) => ({
      id: session.id,
      candidateName: session.invitation.candidateName,
      score: session.score,
      completedAt: session.completedAt,
      category: session.invitation.category.name,
      interviewType: session.invitation.category.interviewType.name,
      summary: session.summary || "",
      fullReport: session.fullReport || "",
      answers: session.answers.map((answer) => ({
        question: answer.question.content,
        transcript: answer.transcript,
      })),
    }));

    res.json({
      data: formattedSessions,
      total: sessions.length,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (error) {
    console.error(
      "[GET] /api/sessions/completed → Erro ao buscar sessões concluídas:",
      error
    );
    res.status(500).json({ error: "Erro ao buscar sessões concluídas." });
  }
});

export default router;
