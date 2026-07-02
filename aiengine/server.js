// server.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import requestRoutes from './routes/requestRoutes.js';

const app = express();

// Security headers
app.use(helmet());

// CORS: allow cross-origin calls
app.use(cors());

// Request logging: method, URL, status, response time
app.use(morgan('dev'));

// JSON body parsing
app.use(express.json());

// Mount API routes under /api
app.use('/api', requestRoutes);

// Port configuration
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`AI Engine API listening on port ${PORT}`);
});