import express from 'express';
import cors from 'cors';
import weatherRoutes from './routes/weatherRoutes';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/weather', weatherRoutes);

export default app;
