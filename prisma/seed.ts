import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

async function main() {
  // Interview Types
  const frontendType = await prisma.interviewType.create({
    data: { name: "Frontend", description: "Entrevistas para devs frontend" },
  });

  const backendType = await prisma.interviewType.create({
    data: { name: "Backend", description: "Entrevistas para devs backend" },
  });

  // Categories
  const [frontendJunior, frontendPleno, backendJunior] = await Promise.all([
    prisma.category.create({
      data: { name: "Dev Júnior", interviewTypeId: frontendType.id },
    }),
    prisma.category.create({
      data: { name: "Dev Pleno", interviewTypeId: frontendType.id },
    }),
    prisma.category.create({
      data: { name: "Dev Júnior", interviewTypeId: backendType.id },
    }),
  ]);

  // Questions
  const questions = await prisma.question.createMany({
    data: [
      { content: "Explique o que é o Virtual DOM.", technologies: "React" },
      {
        content: "Como funciona o event loop no JavaScript?",
        technologies: "JavaScript",
      },
      { content: "Diferença entre SSR e CSR.", technologies: "Next.js" },
      { content: "O que é uma Promise?", technologies: "JavaScript" },
      {
        content: "Explique o funcionamento de useEffect.",
        technologies: "React",
      },
      {
        content: "Como funciona o controle de concorrência no Node.js?",
        technologies: "Node.js",
      },
    ],
  });

  const allQuestions = await prisma.question.findMany();

  // Relacionar perguntas com categorias
  const questionLinks = [
    { questionId: allQuestions[0].id, categoryId: frontendJunior.id, order: 1 },
    { questionId: allQuestions[1].id, categoryId: frontendJunior.id, order: 2 },
    { questionId: allQuestions[2].id, categoryId: frontendJunior.id, order: 3 },
    { questionId: allQuestions[3].id, categoryId: frontendJunior.id, order: 4 },
    { questionId: allQuestions[4].id, categoryId: backendJunior.id, order: 1 },
    { questionId: allQuestions[5].id, categoryId: backendJunior.id, order: 2 },
  ];
  await prisma.questionInCategory.createMany({ data: questionLinks });

  // Criar convites e sessões
  for (let i = 0; i < 15; i++) {
    const category = [frontendJunior, frontendPleno, backendJunior][i % 3];
    const isCompleted = i % 5 !== 0;

    const invitation = await prisma.interviewInvitation.create({
      data: {
        candidateName: faker.person.fullName(),
        candidateEmail: faker.internet.email(),
        categoryId: category.id,
        isCompleted,
        createdAt: faker.date.recent({ days: 30 }),
      },
    });

    if (isCompleted) {
      const session = await prisma.interviewSession.create({
        data: {
          invitationId: invitation.id,
          startTime: faker.date.recent({ days: 15 }),
          completedAt: faker.date.recent({ days: 10 }),
          evaluatedAt: faker.date.recent({ days: 5 }),
          summary: faker.lorem.sentences(2),
          fullReport: faker.lorem.paragraphs(2),
          score: faker.number.float({ min: 30, max: 100 }),
        },
      });

      const questionsForCategory = questionLinks.filter(
        (q) => q.categoryId === category.id
      );
      for (const q of questionsForCategory) {
        await prisma.answer.create({
          data: {
            questionId: q.questionId,
            sessionId: session.id,
            transcript: faker.lorem.sentences(2),
            analysis: faker.lorem.sentences(1),
            score: faker.number.int({ min: 0, max: 10 }),
          },
        });
      }
    }
  }

  console.log("✅ Banco populado com sucesso.");
}

main()
  .catch((e) => {
    console.error("Erro ao executar seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
