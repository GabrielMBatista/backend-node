import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import interviewTypesRoutes from "./routes/interviewTypes";
import categoriesRoutes from "./routes/categories";
import invitationsRoutes from "./routes/invitations";
import sessionsRoutes from "./routes/sessions";
import questionsRouter from "./routes/questions";

dotenv.config();
console.log("DATABASE_URL:", process.env.DATABASE_URL);

const app = express();
app.use(express.json());
app.use(cors());
const PORT = process.env.PORT || 3333;

app.use(interviewTypesRoutes);
app.use(questionsRouter);
app.use(categoriesRoutes);
app.use(invitationsRoutes);
app.use(sessionsRoutes);

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
