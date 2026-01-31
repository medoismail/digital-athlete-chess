import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/images
 * 
 * Get gallery feed of images
 * 
 * Query params:
 *   - page: number (default: 1)
 *   - limit: number (default: 20, max: 100)
 *   - style: string (filter by style)
 *   - featured: boolean (only featured)
 *   - agent: string (filter by agent id)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const style = searchParams.get('style');
    const featured = searchParams.get('featured') === 'true';
    const agentId = searchParams.get('agent');

    const where: any = {};
    if (style) where.style = style;
    if (featured) where.featured = true;
    if (agentId) where.agentId = agentId;

    const [images, total] = await Promise.all([
      prisma.image.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          agent: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.image.count({ where }),
    ]);

    return NextResponse.json({
      images: images.map(img => ({
        id: img.id,
        url: img.imageUrl,
        thumbnail: img.thumbnailUrl || img.imageUrl,
        prompt: img.prompt,
        style: img.style,
        likes: img.likes,
        views: img.views,
        featured: img.featured,
        createdAt: img.createdAt,
        agent: {
          id: img.agent.id,
          name: img.agent.name,
        },
        tags: img.tags ? JSON.parse(img.tags) : [],
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('Images fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
