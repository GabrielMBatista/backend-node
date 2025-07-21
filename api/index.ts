import app from "../src/app";
import { createServer } from "http";

const server = createServer(app);

module.exports = server;
