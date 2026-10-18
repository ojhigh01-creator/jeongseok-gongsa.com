import { processEstimateRequest } from '../src/server/estimateHandler';

/**
 * Vercel Serverless Function Entry Point for /api/estimate
 * Vercel 환경에서 정적 호스팅 시 /api/estimate 엔드포인트 누락 없이
 * 동일한 Gemini 비전 분석 및 표준품셈 계산 엔진을 실행할 수 있도록 지원합니다.
 */
export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed: POST 요청만 허용됩니다.',
    });
  }

  const clientIp =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({
        success: false,
        error: '유효한 JSON 요청 본문이 아닙니다.',
      });
    }
  }

  const result = await processEstimateRequest(body || {}, clientIp);
  return res.status(result.statusCode).json(result.data);
}
