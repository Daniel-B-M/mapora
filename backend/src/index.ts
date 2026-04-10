import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import { connectDatabase } from './config/database';
import countryRoutes from './routes/countries';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10kb' })); // limita tamaño del body
app.use(mongoSanitize() as unknown as express.RequestHandler); // elimina operadores $ y . del body/params

// Rate limiting solo en rutas de auth: máx 10 intentos cada 15 min por IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos, espera 15 minutos' },
  standardHeaders: true,
  legacyHeaders: false,
}) as unknown as express.RequestHandler;

// Health check
app.get('/', (_req, res) => {
  res.json({ status: 'ok', message: 'Mapora API Server Running' });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/countries', countryRoutes);

async function bootstrap() {
  await connectDatabase();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

bootstrap();
