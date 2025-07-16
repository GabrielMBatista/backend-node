import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Certifique-se de configurar a variável de ambiente
});

export async function evaluateSessionWithOpenAI(answers: any[]) {
  try {
    const prompt = generateEvaluationPrompt(answers);

    const response = await openai.chat.completions.create({
      model: "gpt-4", // Use o modelo apropriado
      messages: [
        { role: "system", content: "Você é um avaliador de entrevistas." },
        { role: "user", content: prompt },
      ],
      max_tokens: 500,
    });

    console.log(
      "[evaluateSessionWithOpenAI] → Avaliação realizada com sucesso"
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

function generateEvaluationPrompt(answers: any[]): string {
  let prompt =
    "Você é um avaliador técnico especialista em programação. Avalie as seguintes respostas de uma entrevista técnica:\n\n";

  answers.forEach((answer, index) => {
    if (!answer.question || !answer.question.text) {
      console.warn(
        `[generateEvaluationPrompt] → Resposta inválida ignorada:`,
        answer
      );
      return; // Ignorar respostas sem perguntas associadas
    }

    prompt += `Pergunta ${index + 1}: ${answer.question.text}\n`;
    prompt += `Resposta: ${answer.transcript}\n\n`;
  });

  prompt += `Forneça os seguintes itens em sua avaliação:
1. Um resumo amigável e reconfortante para o candidato, destacando erros e acertos, pontos fortes observados e detalhes obtidos.
2. Um relatório completo voltado para um analista de RH, contendo tudo que ele precisa saber sobre este candidato, incluindo habilidades técnicas, capacidade de comunicação e potencial de crescimento.
3. Uma pontuação geral baseada na performance do candidato.`;

  return prompt;
}

export function parseEvaluationResult(
  evaluationResult: string
): [string, string, number] {
  try {
    const summaryMatch = evaluationResult.match(/Resumo:\s*(.+)/);
    const fullReportMatch = evaluationResult.match(
      /Relatório Completo:\s*(.+)/
    );
    const scoreMatch = evaluationResult.match(/Pontuação:\s*(\d+)/);

    const summary = summaryMatch ? summaryMatch[1] : "Resumo não disponível.";
    const fullReport = fullReportMatch
      ? fullReportMatch[1]
      : "Relatório não disponível.";
    const score = scoreMatch ? parseFloat(scoreMatch[1]) : 0;

    console.log("[parseEvaluationResult] → Resultados extraídos com sucesso");
    return [summary, fullReport, score];
  } catch (error) {
    console.error(
      "[parseEvaluationResult] → Erro ao processar resultado:",
      error
    );
    throw new Error("Erro ao processar resultado da avaliação.");
  }
}
