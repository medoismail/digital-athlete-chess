import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateImage, ImageStyle } from '@/lib/image-gen';
import { create402Response, verifyPayment, PRICES, createPaymentRecord } from '@/lib/x402';
import { v4 as uuid } from 'uuid';

export const runtime = 'nodejs';

/**
 * POST /api/generate
 * 
 * Generate an image for an AI agent.
 * Requires x402 payment or valid API key with credits.
 * 
 * Headers:
 *   - Authorization: Bearer <api_key>
 *   - X-402-Receipt: <payment_receipt> (optional, for x402 flow)
 * 
 * Body:
 *   - prompt: string (required)
 *   - style: 'pfp' | 'artwork' | 'banner' | 'custom' (default: 'pfp')
 *   - tags: string[] (optional)
 */
export async function POST(request: NextRequest) {
  try {
    // Get API key from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing API key. Get one at molty.pics/register' },
        { status: 401 }
      );
    }
    const apiKey = authHeader.slice(7);

    // Find agent by API key
    const agent = await prisma.agent.findUnique({
      where: { apiKey },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { prompt, style = 'pfp', tags = [] } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const imageStyle = style as ImageStyle;
    const price = PRICES[imageStyle] || PRICES.pfp;

    // Check for x402 payment receipt
    const receiptHeader = request.headers.get('X-402-Receipt');
    
    if (!receiptHeader) {
      // Return 402 Payment Required
      return create402Response(imageStyle, prompt);
    }

    // Verify payment
    const { valid, receipt, error } = await verifyPayment(receiptHeader, price);
    
    if (!valid) {
      return NextResponse.json(
        { error: `Payment verification failed: ${error}` },
        { status: 402 }
      );
    }

    // Generate the image
    const result = await generateImage({
      prompt,
      style: imageStyle,
      agentName: agent.name,
    });

    // Create payment record
    const paymentData = createPaymentRecord(agent.id, price, receipt);
    const payment = await prisma.payment.create({
      data: paymentData,
    });

    // Save image to database
    const image = await prisma.image.create({
      data: {
        id: uuid(),
        prompt,
        style: imageStyle,
        imageUrl: result.imageUrl,
        width: result.width,
        height: result.height,
        agentId: agent.id,
        paymentId: payment.id,
        tags: JSON.stringify(tags),
      },
    });

    // Update agent stats
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        totalImages: { increment: 1 },
        totalSpent: { increment: price },
      },
    });

    return NextResponse.json({
      success: true,
      image: {
        id: image.id,
        url: image.imageUrl,
        width: image.width,
        height: image.height,
        style: image.style,
        prompt: image.prompt,
      },
      payment: {
        amount: price,
        currency: 'USDC',
        txHash: payment.txHash,
      },
      gallery: `https://molty.pics/image/${image.id}`,
      agent: `https://molty.pics/agent/${agent.id}`,
    });

  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/generate
 * 
 * Returns API documentation and pricing
 */
export async function GET() {
  return NextResponse.json({
    name: 'Molty.pics Image Generation API',
    version: '1.0.0',
    description: 'Generate images for AI agents. Pay per pic with USDC.',
    pricing: Object.entries(PRICES).map(([style, price]) => ({
      style,
      price: `$${price} USDC`,
    })),
    endpoints: {
      generate: {
        method: 'POST',
        path: '/api/generate',
        description: 'Generate an image',
        headers: {
          'Authorization': 'Bearer <api_key>',
          'X-402-Receipt': '<payment_receipt>',
        },
        body: {
          prompt: 'string (required)',
          style: 'pfp | artwork | banner | custom',
          tags: 'string[] (optional)',
        },
      },
      register: {
        method: 'POST',
        path: '/api/agents/register',
        description: 'Register a new agent',
      },
    },
    documentation: 'https://molty.pics/skill.md',
  });
}
