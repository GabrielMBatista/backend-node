import express from "express";
import dotenv from "dotenv";
import cors from "cors";

// Rotas
import interviewTypesRoutes from "./routes/interviewTypes";
import categoriesRoutes from "./routes/categories";
import invitationsRoutes from "./routes/invitations";
import questionsRouter from "./routes/questions";
import transcribeRoutes from "./routes/transcribe";
import sessionsRoutes from "./routes/sessions";

// Configura variáveis de ambiente
dotenv.config();
// console.log("DATABASE_URL:", process.env.DATABASE_URL);

// Inicializa o app Express
const app = express();
app.use(express.json());
app.use(cors());
const PORT = process.env.PORT || 3333;

// Define rotas
app.use(interviewTypesRoutes);
app.use(questionsRouter);
app.use(categoriesRoutes);
app.use(invitationsRoutes);
app.use(transcribeRoutes);
app.use(sessionsRoutes);

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

// Exporta o app, sem chamar app.listen()
export default app;
