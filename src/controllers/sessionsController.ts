import { getPrismaClient } from "../lib/prisma";

const prisma = getPrismaClient();

interface GetCompletedSessionsParams {
  startDate?: Date;
  endDate?: Date;
  columns?: string[];
}

export async function getCompletedSessions({
  startDate,
  endDate,
  columns,
}: GetCompletedSessionsParams): Promise<any[]> {
  try {
    const filters: any = {
      completedAt: {},
    };

    if (startDate) {
      filters.completedAt.gte = startDate;
    }
    if (endDate) {
      filters.completedAt.lte = endDate;
    }

    // Remove 'completedAt' se vazio
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

    return sessions.map((session) => ({
      id: session.id,
      candidateName: session.invitation.candidateName,
      score: session.score,
      startTime: session.startTime,
      completedAt: session.completedAt,
      category: session.invitation.category.name,
      interviewType: session.invitation.category.interviewType.name,
      summary: session.summary,
      fullReport: session.fullReport,
      answers: session.answers.map((answer) => ({
        question: answer.question.content,
        response: answer.transcript,
      })),
    }));
  } catch (error: any) {
    console.error(
      "[getCompletedSessions] → Erro ao buscar sessões:",
      error.message || error
    );
    throw new Error(
      `Erro ao buscar sessões concluídas: ${
        error.message || "Erro desconhecido."
      }`
    );
  }
}
