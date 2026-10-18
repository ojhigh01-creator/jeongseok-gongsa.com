import crypto from 'crypto';
import { EstimateTicket, TicketStatus } from '../types/membership';

// Server-side secret for HMAC token signing
const TICKET_SECRET = process.env.TICKET_SECRET || 'jeongseok_ai_estimate_secure_ticket_key_2026';

// In-memory persistent ticket store across requests
const ticketStore = new Map<string, EstimateTicket>();

/**
 * Generate a verifiable HMAC-SHA256 token for a ticket ID
 */
export function generateTicketToken(ticketId: string, phone: string, timestamp: number): string {
  const payload = `${ticketId}:${phone}:${timestamp}`;
  const hmac = crypto.createHmac('sha256', TICKET_SECRET);
  hmac.update(payload);
  const signature = hmac.digest('hex').substring(0, 24);
  return `TK_${Buffer.from(payload).toString('base64url')}_${signature}`;
}

/**
 * Verify HMAC signature of a ticket token
 */
export function verifyTicketTokenSignature(token: string): { valid: boolean; ticketId?: string; phone?: string } {
  if (!token || !token.startsWith('TK_')) {
    return { valid: false };
  }
  const parts = token.split('_');
  if (parts.length !== 3) {
    return { valid: false };
  }
  const encodedPayload = parts[1];
  const givenSig = parts[2];
  try {
    const rawPayload = Buffer.from(encodedPayload, 'base64url').toString('utf8');
    const [ticketId, phone, timestamp] = rawPayload.split(':');
    const hmac = crypto.createHmac('sha256', TICKET_SECRET);
    hmac.update(`${ticketId}:${phone}:${timestamp}`);
    const expectedSig = hmac.digest('hex').substring(0, 24);
    if (crypto.timingSafeEqual(Buffer.from(givenSig), Buffer.from(expectedSig))) {
      return { valid: true, ticketId, phone };
    }
  } catch {
    return { valid: false };
  }
  return { valid: false };
}

/**
 * Issue a new 1,000 KRW AI Estimate Ticket
 */
export function issueTicket(params: {
  userId: string;
  userPhone: string;
  userName: string;
  paymentMethod: 'card' | 'kakaopay' | 'tosspay' | 'vbank';
  paymentOrderId?: string;
}): EstimateTicket {
  const now = Date.now();
  const randomSuffix = crypto.randomBytes(4).toString('hex').toUpperCase();
  const ticketId = `TKT-${now}-${randomSuffix}`;
  const token = generateTicketToken(ticketId, params.userPhone, now);

  const ticket: EstimateTicket = {
    ticketId,
    token,
    userId: params.userId,
    userPhone: params.userPhone,
    userName: params.userName || '정석공사 유료회원',
    amount: 1000,
    status: 'active',
    paymentMethod: params.paymentMethod,
    paymentOrderId: params.paymentOrderId || `PAY-${now}-${randomSuffix}`,
    createdAt: now,
  };

  ticketStore.set(ticketId, ticket);
  ticketStore.set(token, ticket); // Fast lookup by token as well
  return ticket;
}

export interface TicketConsumptionResult {
  valid: boolean;
  ticket?: EstimateTicket;
  error?: string;
  statusCode?: number;
}

/**
 * Strictly verify that a valid paid ticket exists and has not been used yet.
 * If valid, atomicaly marks as 'used' to prevent double usage.
 */
export function verifyAndConsumeTicket(
  ticketTokenOrId: string | undefined,
  usageInfo?: { category?: string; pyeong?: number }
): TicketConsumptionResult {
  if (!ticketTokenOrId || typeof ticketTokenOrId !== 'string' || ticketTokenOrId.trim() === '') {
    return {
      valid: false,
      statusCode: 402, // Payment Required
      error: 'AI 견적 분석을 위해서는 1,000원 유료회원 이용권 결제가 필요합니다. 이용권을 구매하거나 확인해 주세요.',
    };
  }

  const cleanKey = ticketTokenOrId.trim();

  // Try direct lookup from in-memory ticketStore
  let ticket = ticketStore.get(cleanKey);

  // If not found directly, check if it is a cryptographically valid token
  if (!ticket) {
    const verified = verifyTicketTokenSignature(cleanKey);
    if (verified.valid && verified.ticketId) {
      ticket = ticketStore.get(verified.ticketId);
    }
  }

  if (!ticket) {
    return {
      valid: false,
      statusCode: 403,
      error: '유효하지 않은 이용권 토큰입니다. 결제 내역을 확인하거나 다시 결제해 주세요.',
    };
  }

  if (ticket.status === 'used') {
    return {
      valid: false,
      statusCode: 409,
      error: `이미 사용 완료된 이용권입니다 (사용일시: ${new Date(ticket.usedAt || 0).toLocaleString('ko-KR')}). 추가 분석을 원하시면 1,000원 이용권을 추가 충전해 주세요.`,
    };
  }

  if (ticket.status !== 'active') {
    return {
      valid: false,
      statusCode: 403,
      error: `현재 사용할 수 없는 이용권 상태입니다 (${ticket.status}).`,
    };
  }

  // Atomically mark ticket as used
  ticket.status = 'used';
  ticket.usedAt = Date.now();
  if (usageInfo?.category) ticket.usedCategory = usageInfo.category;
  if (usageInfo?.pyeong) ticket.usedPyeong = usageInfo.pyeong;

  return {
    valid: true,
    ticket,
  };
}

export function getTicket(ticketIdOrToken: string): EstimateTicket | undefined {
  return ticketStore.get(ticketIdOrToken);
}

export function getAllTickets(): EstimateTicket[] {
  const uniqueTickets = new Map<string, EstimateTicket>();
  for (const ticket of ticketStore.values()) {
    uniqueTickets.set(ticket.ticketId, ticket);
  }
  return Array.from(uniqueTickets.values()).sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Testing helper: reset ticket store
 */
export function _resetTicketStoreForTesting(): void {
  ticketStore.clear();
}
