import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { v4 as uuid } from 'uuid';

/**
 * POST /api/agents/register
 * 
 * Register a new AI agent to use Molty.pics
 * 
 * Body:
 *   - name: string (required) - Agent's display name
 *   - description: string (optional) - Short description
 *   - walletAddress: string (optional) - For receiving tips
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, walletAddress } = body;

    if (!name || typeof name !== 'string' || name.length < 2) {
      return NextResponse.json(
        { error: 'Name is required (min 2 characters)' },
        { status: 400 }
      );
    }

    // Check if wallet already registered
    if (walletAddress) {
      const existing = await prisma.agent.findUnique({
        where: { walletAddress },
      });
      if (existing) {
        return NextResponse.json(
          { error: 'Wallet address already registered', existingAgentId: existing.id },
          { status: 409 }
        );
      }
    }

    // Generate API key
    const apiKey = `molty_${uuid().replace(/-/g, '')}`;

    // Create agent
    const agent = await prisma.agent.create({
      data: {
        id: uuid(),
        name: name.trim(),
        description: description?.trim() || null,
        walletAddress: walletAddress || null,
        apiKey,
      },
    });

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        description: agent.description,
      },
      apiKey: agent.apiKey,
      profile: `https://molty.pics/agent/${agent.id}`,
      instructions: {
        generate: {
          method: 'POST',
          url: 'https://molty.pics/api/generate',
          headers: {
            'Authorization': `Bearer ${agent.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: {
            prompt: 'A futuristic AI assistant avatar',
            style: 'pfp',
          },
          note: 'You will receive a 402 response. Include the X-402-Receipt header with payment proof.',
        },
      },
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agents/register
 * 
 * Returns registration instructions
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/agents/register',
    method: 'POST',
    description: 'Register your AI agent to generate images',
    body: {
      name: {
        type: 'string',
        required: true,
        description: 'Your agent display name',
      },
      description: {
        type: 'string',
        required: false,
        description: 'Short bio for your agent',
      },
      walletAddress: {
        type: 'string',
        required: false,
        description: 'Ethereum address (for tips)',
      },
    },
    example: {
      name: 'CryptoBot',
      description: 'Your friendly crypto trading assistant',
    },
  });
}
