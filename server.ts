import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { processEstimateRequest } from './src/server/estimateHandler';
import { getCostControlSummary } from './src/server/costControl';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Body parser for JSON with base64 image support (up to 10MB)
app.use(express.json({ limit: '10mb' }));

import { issueTicket, getAllTickets, getTicket } from './src/server/ticketStore';

// API: POST /api/estimate
app.post('/api/estimate', async (req, res) => {
  const clientIp =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown';

  const result = await processEstimateRequest(req.body, clientIp);
  res.status(result.statusCode).json(result.data);
});

// API: POST /api/ticket/issue (1,000 KRW paid membership estimate ticket issuance)
app.post('/api/ticket/issue', (req, res) => {
  const { userId, userPhone, userName, paymentMethod, paymentOrderId } = req.body || {};
  if (!userPhone) {
    return res.status(400).json({ success: false, error: '회원 휴대폰 번호가 필요합니다.' });
  }
  const ticket = issueTicket({
    userId: userId || `USER_${userPhone.replace(/[^0-9]/g, '')}`,
    userPhone,
    userName: userName || '건우 정석공사 유료회원',
    paymentMethod: paymentMethod || 'card',
    paymentOrderId,
  });
  res.json({ success: true, ticket });
});

// API: POST /api/ticket/verify
app.post('/api/ticket/verify', (req, res) => {
  const { ticketToken } = req.body || {};
  if (!ticketToken) {
    return res.status(400).json({ success: false, error: '이용권 토큰이 필요합니다.' });
  }
  const ticket = getTicket(ticketToken);
  if (!ticket) {
    return res.status(404).json({ success: false, error: '이용권을 찾을 수 없습니다.' });
  }
  res.json({ success: true, ticket });
});

// API: GET /api/tickets (Admin inquiry for ticket records)
app.get('/api/tickets', (_req, res) => {
  const tickets = getAllTickets();
  res.json({ success: true, tickets });
});

// API: POST /api/order/create (Living care supplies order placement)
app.post('/api/order/create', (req, res) => {
  const order = req.body;
  if (!order || !order.items || order.items.length === 0) {
    return res.status(400).json({ success: false, error: '주문할 상품 내역이 없습니다.' });
  }
  res.json({ success: true, order });
});

// API: GET /api/estimate/cost-summary (Internal monitoring & cost control stats)
app.get('/api/estimate/cost-summary', (_req, res) => {
  const summary = getCostControlSummary();
  res.json({ success: true, summary });
});

// Production vs Development Server Mount
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(
      `[Jeongseok Full-Stack Server] running on http://localhost:${PORT} (${
        isProduction ? 'production' : 'development'
      })`
    );
  });
}

startServer();
