import { Router } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const router = Router();

// Usar a pasta temporária do sistema (/tmp)
const tempDir = "/tmp/uploads";
fs.mkdirSync(tempDir, { recursive: true });

const upload = multer({ dest: tempDir });

router.post("/api/transcribe", upload.single("audio"), async (req, res) => {
  console.log("[POST] /api/transcribe → Iniciando requisição");

  const audioFile = req.file;
  if (!audioFile) {
    console.error("[POST] /api/transcribe → Arquivo de áudio não enviado");
    return res.status(400).json({ error: "Arquivo de áudio é obrigatório." });
  }

  const originalPath = audioFile.path;
  const ext = ".webm";
  const renamedPath = originalPath + ext;

  try {
    // Renomeia o arquivo para garantir a extensão correta
    fs.renameSync(originalPath, renamedPath);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.audio.transcriptions.create({
      file: fs.createReadStream(renamedPath),
      model: "whisper-1",
      language: "pt",
    });

    console.log("[POST] /api/transcribe → Transcrição realizada com sucesso");
    res.json({ transcription: response.text });
  } catch (error) {
    console.error("[POST] /api/transcribe → Erro ao transcrever áudio:", error);
    res.status(500).json({ error: "Erro ao transcrever áudio." });
  } finally {
    try {
      fs.unlinkSync(renamedPath);
    } catch (err) {
      console.error(
        "[POST] /api/transcribe → Erro ao excluir arquivo temporário:",
        err
      );
    }
  }
});

export default router;
