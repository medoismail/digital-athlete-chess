'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

interface ImageCardProps {
  id: string;
  url: string;
  prompt: string;
  style: string;
  likes: number;
  views: number;
  agent: {
    id: string;
    name: string;
  };
  createdAt: string;
}

export default function ImageCard({
  id,
  url,
  prompt,
  style,
  likes: initialLikes,
  views,
  agent,
  createdAt,
}: ImageCardProps) {
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (liked) return;
    
    setLiked(true);
    setLikes(prev => prev + 1);
    
    try {
      await fetch(`/api/images/${id}`, { method: 'POST' });
    } catch (error) {
      // Revert on error
      setLiked(false);
      setLikes(prev => prev - 1);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Link href={`/image/${id}`}>
      <div className="gradient-border card-hover overflow-hidden">
        <div className="relative aspect-square bg-molty-card">
          {!imageError ? (
            <Image
              src={url}
              alt={prompt}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          
          {/* Style badge */}
          <div className="absolute top-3 left-3">
            <span className="px-2 py-1 text-xs font-medium bg-black/50 backdrop-blur-sm rounded-full">
              {style}
            </span>
          </div>

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity">
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <p className="text-sm text-gray-200 line-clamp-2 mb-2">{prompt}</p>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Link 
              href={`/agent/${agent.id}`}
              className="text-sm font-medium hover:text-molty-purple transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {agent.name}
            </Link>
            <span className="text-xs text-gray-500">{formatDate(createdAt)}</span>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 transition-colors ${
                liked ? 'text-molty-pink' : 'hover:text-molty-pink'
              }`}
            >
              <svg className="w-4 h-4" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {likes}
            </button>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {views}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
