# backend-node

Backend em Node.js para gerenciamento de entrevistas técnicas.
Fornece APIs REST para lidar com perguntas, categorias, convites, sessões de entrevista,
transcrição de áudio e avaliação automática de respostas usando a API da OpenAI.

## Estrutura do projeto

- `src/app.ts` – ponto de entrada e configuração do Express.
- `src/routes/` – rotas REST (perguntas, categorias, convites, sessões, transcribe etc).
- `src/controllers/` – lógica de negócios; ex.: `sessionsController.ts` para
  agregação de sessões concluídas.
- `src/lib/` – utilitários como cliente do Prisma e integração com a OpenAI.
- `api/index.ts` – wrapper HTTP para execução em ambientes serverless (Vercel).
- `prisma/` – schema do banco de dados, migrações e scripts de seed.

## Pré‑requisitos

- Node.js 18+
- Banco de dados PostgreSQL acessível via `DATABASE_URL`
- Chave da OpenAI em `OPENAI_API_KEY` para transcrição e avaliação

## Instalação

```bash
npm install
```

Crie um arquivo `.env` com as variáveis necessárias:

```dotenv
DATABASE_URL="postgresql://usuario:senha@host:5432/banco"
OPENAI_API_KEY="sua-chave"
PORT=3333 # opcional
```

## Execução

### Ambiente de desenvolvimento

```bash
npm run dev
```

### Build e produção

```bash
npm run build
npm start
```

## Exemplos de uso

### Listar perguntas de uma categoria

```bash
curl "http://localhost:3333/api/questions?categoryId=UUID&page=1&limit=5"
```

Resposta:

```json
{
  "data": [ /* perguntas */ ],
  "total": 42,
  "page": 1,
  "limit": 5
}
```

### Transcrever áudio

```bash
curl -F "audio=@resposta.webm" http://localhost:3333/api/transcribe
```

### Avaliar sessão com a OpenAI (exemplo de código)

```ts
import { evaluateSessionWithOpenAI } from "./src/lib/openai";

const feedback = await evaluateSessionWithOpenAI(answers, { name: "Backend" });
console.log(feedback);
```

## Scripts disponíveis

- `npm run dev` – inicia o servidor com recarga automática via `ts-node-dev`.
- `npm run build` – compila o TypeScript para `dist/`.
- `npm start` – executa o código compilado.

