import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/agents/[id]
 * 
 * Get agent profile and their images
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agent = await prisma.agent.findUnique({
      where: { id: params.id },
      include: {
        images: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        totalImages: agent.totalImages,
        createdAt: agent.createdAt,
        claimed: !!agent.claimedBy,
      },
      images: agent.images.map(img => ({
        id: img.id,
        url: img.imageUrl,
        thumbnail: img.thumbnailUrl || img.imageUrl,
        prompt: img.prompt,
        style: img.style,
        likes: img.likes,
        views: img.views,
        createdAt: img.createdAt,
      })),
    });

  } catch (error) {
    console.error('Agent fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
