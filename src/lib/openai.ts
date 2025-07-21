import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Certifique-se de configurar a variável de ambiente
});

export async function evaluateSessionWithOpenAI(
  answers: any[],
  category: { name: string }
): Promise<string> {
  try {
    if (!answers || answers.length === 0) {
      throw new Error("Nenhuma resposta fornecida para avaliação.");
    }

    const prompt = generateEvaluationPrompt(answers, category);
    console.log("[evaluateSessionWithOpenAI] → Prompt gerado:", prompt);

    const response = await openai.chat.completions.create({
      model: "gpt-4", // Use o modelo apropriado
      messages: [
        { role: "system", content: "Você é um avaliador de entrevistas." },
        { role: "user", content: prompt },
      ],
      max_tokens: 500,
    });

    if (!response || !response.choices || response.choices.length === 0) {
      throw new Error("Resposta inválida ou vazia da OpenAI.");
    }

    console.log(
      "[evaluateSessionWithOpenAI] → Resposta da OpenAI recebida:",
      response
    );

    const messageContent = response.choices[0]?.message?.content;
    if (!messageContent) {
      throw new Error("A resposta da OpenAI não contém conteúdo válido.");
    }
    return messageContent.trim(); // Retorna o texto gerado pela OpenAI
  } catch (error) {
    console.error(
      "[evaluateSessionWithOpenAI] → Erro ao interagir com a API da OpenAI:",
      error
    );
    throw new Error("Erro ao avaliar sessão com OpenAI.");
  }
}

function generateEvaluationPrompt(
  answers: any[],
  category: { name: string }
): string {
  if (!answers || answers.length === 0) {
    throw new Error("Nenhuma resposta fornecida para gerar o prompt.");
  }

  if (!category || !category.name) {
    throw new Error(
      "Categoria inválida fornecida para o contexto da entrevista."
    );
  }

  let prompt =
    `O nível da entrevista é: ${category.name}.\n` +
    "a unica resposta focada para o usuario é o resumo no resumo seja mais imparcial sem entregar se o usuario foi bem ou mal porem aponte coisas que ele acertou e errou seguindo a logica de entrevistas Sandwich, todo o resto deve focar na experiência do avaliador. ex Potencial de Crescimento caso o usuario não demonstre nenhum ou pouco potencial podemos informar ao avaliador que o usuario parece não se encaixar na vaga de forma direta e sincera\n" +
    "Leve esse contexto em consideração ao avaliar as respostas da entrevista técnica e retorne exclusivamente um JSON estruturado com os seguintes campos:\n\n" +
    `{
  "summary": "Mensagem amigável para o candidato.",
  "fullReport": {
    "nivelDeConhecimento": "Avaliação do domínio técnico geral.",
    "comunicacao": "Como o candidato se comunica e articula ideias técnicas.",
    "pontosFortes": ["Lista de pontos positivos identificados."],
    "pontosDeMelhoria": ["Lista de pontos que precisam evoluir."],
    "potencialDeCrescimento": "Comentário sobre potencial futuro ou adaptabilidade caso exista deve ser direto."
  },
  "score": 0-100
}\n\n` +
    "Não inclua nenhum texto fora do JSON. Apenas o JSON puro.\n\n";

  let validAnswersCount = 0;

  answers.forEach((answer, index) => {
    if (
      !answer ||
      !answer.transcript ||
      answer.transcript.trim().length === 0
    ) {
      console.warn(
        `[generateEvaluationPrompt] → Resposta ignorada por falta de transcrição válida:`,
        answer
      );
      return; // Ignorar respostas sem transcrição válida
    }

    const questionContent =
      answer.question?.content || "[Pergunta indisponível]";

    prompt += `Pergunta ${index + 1}: ${questionContent}\n`;
    prompt += `Resposta: ${answer.transcript.trim()}\n\n`;
    validAnswersCount++;
  });

  if (validAnswersCount === 0) {
    throw new Error("Nenhuma resposta válida encontrada para gerar o prompt.");
  }

  console.log("[generateEvaluationPrompt] → Prompt final:", prompt);
  return prompt;
}

export function parseEvaluationResult(
  evaluationResult: string
): [string, any, number] {
  try {
    if (!evaluationResult || typeof evaluationResult !== "string") {
      throw new Error("Resultado da avaliação inválido ou vazio.");
    }

    console.log(
      "[parseEvaluationResult] → Resultado recebido:",
      evaluationResult
    );

    const parsed = JSON.parse(evaluationResult);

    const summary =
      typeof parsed.summary === "string"
        ? parsed.summary.trim()
        : "Resumo não disponível.";

    const fullReport =
      parsed.fullReport && typeof parsed.fullReport === "object"
        ? {
            nivelDeConhecimento:
              parsed.fullReport.nivelDeConhecimento || "Não disponível.",
            comunicacao: parsed.fullReport.comunicacao || "Não disponível.",
            pontosFortes: Array.isArray(parsed.fullReport.pontosFortes)
              ? parsed.fullReport.pontosFortes
              : [],
            pontosDeMelhoria: Array.isArray(parsed.fullReport.pontosDeMelhoria)
              ? parsed.fullReport.pontosDeMelhoria
              : [],
            potencialDeCrescimento:
              parsed.fullReport.potencialDeCrescimento || "Não disponível.",
          }
        : {
            nivelDeConhecimento: "Não disponível.",
            comunicacao: "Não disponível.",
            pontosFortes: [],
            pontosDeMelhoria: [],
            potencialDeCrescimento: "Não disponível.",
          };

    const score =
      typeof parsed.score === "number" &&
      parsed.score >= 0 &&
      parsed.score <= 100
        ? parsed.score
        : 0;

    console.log("[parseEvaluationResult] → Resultados extraídos:", {
      summary,
      fullReport,
      score,
    });

    return [summary, fullReport, score];
  } catch (error) {
    console.error(
      "[parseEvaluationResult] → Erro ao processar resultado:",
      error
    );
    return [
      "Resumo não disponível.",
      {
        nivelDeConhecimento: "Não disponível.",
        comunicacao: "Não disponível.",
        pontosFortes: [],
        pontosDeMelhoria: [],
        potencialDeCrescimento: "Não disponível.",
      },
      0,
    ];
  }
}
