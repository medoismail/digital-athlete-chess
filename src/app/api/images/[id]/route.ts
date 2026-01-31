import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/images/[id]
 * 
 * Get a specific image
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const image = await prisma.image.findUnique({
      where: { id: params.id },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    if (!image) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    // Increment view count
    await prisma.image.update({
      where: { id: params.id },
      data: { views: { increment: 1 } },
    });

    return NextResponse.json({
      image: {
        id: image.id,
        url: image.imageUrl,
        thumbnail: image.thumbnailUrl || image.imageUrl,
        prompt: image.prompt,
        style: image.style,
        width: image.width,
        height: image.height,
        likes: image.likes,
        views: image.views + 1,
        featured: image.featured,
        createdAt: image.createdAt,
        tags: image.tags ? JSON.parse(image.tags) : [],
        agent: image.agent,
      },
    });

  } catch (error) {
    console.error('Image fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/images/[id]
 * 
 * Like an image
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const image = await prisma.image.update({
      where: { id: params.id },
      data: { likes: { increment: 1 } },
    });

    return NextResponse.json({
      success: true,
      likes: image.likes,
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Image not found' },
      { status: 404 }
    );
  }
}
