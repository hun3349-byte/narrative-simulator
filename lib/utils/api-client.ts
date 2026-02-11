import Anthropic from '@anthropic-ai/sdk';

let anthropicClient: Anthropic | null = null;

function getClient(): Anthropic {
  if (!anthropicClient) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY가 설정되지 않았습니다. .env.local 파일을 확인하세요.');
    }
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropicClient;
}

async function callApi(
  model: string,
  prompt: string,
  maxTokens: number,
  temperature: number,
  retries = 3
): Promise<string> {
  const client = getClient();

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
        temperature,
      });

      const textBlock = response.content.find(block => block.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('No text response from API');
      }
      return textBlock.text;
    } catch (error: unknown) {
      const isRateLimit = error instanceof Error && 'status' in error && (error as { status: number }).status === 429;

      if (attempt < retries && (isRateLimit || (error instanceof Error && error.message.includes('overloaded')))) {
        const delay = isRateLimit ? 10000 * attempt : 3000 * attempt;
        console.warn(`API 호출 실패 (시도 ${attempt}/${retries}), ${delay / 1000}초 후 재시도...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }

  throw new Error('최대 재시도 횟수 초과');
}

// 시뮬레이션용 (큰 흐름) — Haiku (저비용)
export async function generateSimulation(prompt: string): Promise<string> {
  return callApi('claude-haiku-4-5-20251001', prompt, 2048, 0.9);
}

// 세밀 장면용 (문학적 퀄리티) — Sonnet (고품질)
export async function generateDetail(prompt: string): Promise<string> {
  return callApi('claude-sonnet-4-5-20250929', prompt, 4096, 0.85);
}

// 구조화용 (JSON 출력) — Haiku (저비용, 낮은 temperature)
export async function generateStructure(prompt: string): Promise<string> {
  return callApi('claude-haiku-4-5-20251001', prompt, 4096, 0.2);
}
