import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";

const prisma = new PrismaClient().$extends(withAccelerate());

async function main() {
  // Criar InterviewTypes
  const frontendType = await prisma.interviewType.create({
    data: {
      name: "Frontend",
      description: "Entrevistas para desenvolvedores Frontend",
    },
  });

  const backendType = await prisma.interviewType.create({
    data: {
      name: "Backend",
      description: "Entrevistas para desenvolvedores Backend",
    },
  });

  // Criar Categories
  const frontendJunior = await prisma.category.create({
    data: { name: "Dev Júnior", interviewTypeId: frontendType.id },
  });

  const frontendPleno = await prisma.category.create({
    data: { name: "Dev Pleno", interviewTypeId: frontendType.id },
  });

  const backendJunior = await prisma.category.create({
    data: { name: "Dev Júnior", interviewTypeId: backendType.id },
  });

  // Criar Questions
  await prisma.question.createMany({
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

  // Buscar Questions com IDs
  const questions = await prisma.question.findMany({
    orderBy: { createdAt: "asc" },
  });

  // Relacionar perguntas às categorias com ordem
  const frontendJuniorQuestions = [
    { questionId: questions[0].id, categoryId: frontendJunior.id, order: 1 },
    { questionId: questions[1].id, categoryId: frontendJunior.id, order: 2 },
    { questionId: questions[2].id, categoryId: frontendJunior.id, order: 3 },
    { questionId: questions[3].id, categoryId: frontendJunior.id, order: 4 },
  ];

  const backendJuniorQuestions = [
    { questionId: questions[4].id, categoryId: backendJunior.id, order: 1 },
    { questionId: questions[5].id, categoryId: backendJunior.id, order: 2 },
  ];

  await prisma.questionInCategory.createMany({
    data: [...frontendJuniorQuestions, ...backendJuniorQuestions],
  });

  console.log("Banco de dados populado com sucesso!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
