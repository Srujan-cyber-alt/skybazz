import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import requestRoutes from './routes/requestRoutes.js';
import workflowRoutes from './src/routes/workflowRoutes.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (req, res) => {
  return res.status(200).json({
    success: true,
    service: 'aiengine',
    message: 'Service is healthy'
  });
});

app.use('/api', requestRoutes);
app.use('/api/workflows', workflowRoutes);

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

export default app;