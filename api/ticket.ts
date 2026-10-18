import { issueTicket, getAllTickets, getTicket } from '../src/server/ticketStore';

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  if (req.method === 'POST') {
    const { action, userId, userPhone, userName, paymentMethod, paymentOrderId, ticketToken } = body || {};

    if (action === 'verify' || ticketToken) {
      const ticket = getTicket(ticketToken);
      if (!ticket) {
        return res.status(404).json({ success: false, error: '이용권을 찾을 수 없습니다.' });
      }
      return res.status(200).json({ success: true, ticket });
    }

    // Default action: issue ticket
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

    return res.status(200).json({ success: true, ticket });
  }

  if (req.method === 'GET') {
    const tickets = getAllTickets();
    return res.status(200).json({ success: true, tickets });
  }

  return res.status(405).json({ success: false, error: 'Method Not Allowed' });
}
