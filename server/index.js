import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import matchRoutes from './routes/matchRoutes.js';
import { registerGameSocketHandlers } from './sockets/gameSocket.js';
import { startExpiredMatchSweeper } from './utils/expiredMatchSweeper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientRoot = path.resolve(__dirname, '../client');
const clientDist = path.resolve(clientRoot, 'dist');
const serverEnvPath = path.resolve(__dirname, '.env');

dotenv.config({ path: serverEnvPath });

const PORT = Number(process.env.PORT) || 3000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const MONGODB_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  '<MONGODB_URI_PLACEHOLDER>';
const isDevelopment = process.env.NODE_ENV !== 'production';

const app = express();
app.disable('x-powered-by');

app.use(
  cors({
    origin: CLIENT_URL.split(',').map((origin) => origin.trim()),
    methods: ['GET', 'POST'],
    credentials: true,
  })
);
app.use(express.json({ limit: '64kb' }));

app.get('/health', (_request, response) => {
  response.status(200).json({ status: 'ok' });
});

app.use(matchRoutes);

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URL.split(',').map((origin) => origin.trim()),
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  maxHttpBufferSize: 1e6,
  allowEIO3: true,
  perMessageDeflate: false,
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('error', (error) => {
    console.error('Socket error:', socket.id, error);
  });

  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', socket.id, reason);
  });

  registerGameSocketHandlers(io, socket);
});

const bootstrap = async () => {
  if (MONGODB_URI.includes('<MONGODB_URI_PLACEHOLDER>')) {
    throw new Error('MONGO_URI is not configured. Add it to your server environment variables.');
  }

  if (isDevelopment) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      root: clientRoot,
      appType: 'spa',
      server: {
        middlewareMode: true,
        host: true,
        hmr: {
          clientPort: 443,
          protocol: 'wss',
        },
      },
    });

    app.use(vite.middlewares);
    app.use(async (request, response, next) => {
      if (request.method !== 'GET' || request.originalUrl.startsWith('/socket.io')) {
        next();
        return;
      }

      try {
        const indexPath = path.resolve(clientRoot, 'index.html');
        const template = await fs.readFile(indexPath, 'utf-8');
        const html = await vite.transformIndexHtml(request.originalUrl, template);
        response.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (error) {
        vite.ssrFixStacktrace(error);
        next(error);
      }
    });
  } else {
    app.use(express.static(clientDist));
    app.use((request, response, next) => {
      if (request.method !== 'GET' || request.originalUrl.startsWith('/socket.io')) {
        next();
        return;
      }

      response.sendFile(path.resolve(clientDist, 'index.html'));
    });
  }

  await mongoose.connect(MONGODB_URI, {
    autoIndex: true,
  });

  startExpiredMatchSweeper(io);

  httpServer.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
};

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
