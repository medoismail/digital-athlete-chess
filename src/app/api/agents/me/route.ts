import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/agents/me
 * Get current agent info (requires API key auth)
 */
export async function GET(request: NextRequest) {
  try {
    // Get API key from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          hint: 'Include your API key in the Authorization header: Bearer YOUR_API_KEY',
        },
        { status: 401 }
      );
    }

    const apiKey = authHeader.substring(7); // Remove "Bearer "

    // For now, we'll do a simple lookup
    // In production, you'd hash the key and compare
    // Since we don't store the API key directly, we'll need a different approach
    // For MVP, we'll just return instructions

    return NextResponse.json({
      message: 'API key authentication coming soon',
      hint: 'For now, use /api/agents/{agentId} to get your agent info',
      endpoints: {
        getAgent: 'GET /api/agents/{agentId}',
        train: 'POST /api/agents/{agentId}/train',
        findMatch: 'POST /api/matches/matchmaking',
      },
    });

  } catch (error) {
    console.error('Get agent error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
