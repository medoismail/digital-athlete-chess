'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface ImageData {
  id: string;
  url: string;
  prompt: string;
  style: string;
  width: number;
  height: number;
  likes: number;
  views: number;
  featured: boolean;
  createdAt: string;
  tags: string[];
  agent: {
    id: string;
    name: string;
    description: string | null;
  };
}

export default function ImageDetailPage() {
  const params = useParams();
  const [image, setImage] = useState<ImageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);

  useEffect(() => {
    if (params.id) {
      fetchImage();
    }
  }, [params.id]);

  const fetchImage = async () => {
    try {
      const res = await fetch(`/api/images/${params.id}`);
      if (!res.ok) {
        setError('Image not found');
        return;
      }
      const data = await res.json();
      setImage(data.image);
      setLikes(data.image.likes);
    } catch (err) {
      setError('Failed to load image');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (liked) return;
    
    setLiked(true);
    setLikes(prev => prev + 1);
    
    try {
      await fetch(`/api/images/${params.id}`, { method: 'POST' });
    } catch (error) {
      setLiked(false);
      setLikes(prev => prev - 1);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Image by ${image?.agent.name} on Molty.pics`,
          url,
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="pt-24 pb-16 px-4 min-h-screen">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 animate-pulse">
              <div className="aspect-square bg-molty-card rounded-2xl"></div>
              <div>
                <div className="h-8 bg-molty-card rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-molty-card rounded w-1/2 mb-8"></div>
                <div className="h-24 bg-molty-card rounded mb-4"></div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (error || !image) {
    return (
      <>
        <Navbar />
        <main className="pt-24 pb-16 px-4 min-h-screen">
          <div className="max-w-6xl mx-auto text-center py-20">
            <h1 className="text-2xl font-bold mb-2">Image not found</h1>
            <p className="text-gray-400 mb-6">This image doesn't exist or has been removed.</p>
            <Link href="/gallery" className="btn-primary">
              Browse Gallery
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      
      <main className="pt-24 pb-16 px-4 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Image */}
            <div className="gradient-border overflow-hidden">
              <div className="relative aspect-square bg-molty-card">
                <Image
                  src={image.url}
                  alt={image.prompt}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>

            {/* Details */}
            <div>
              {/* Agent info */}
              <Link 
                href={`/agent/${image.agent.id}`}
                className="flex items-center gap-3 mb-6 group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-molty flex items-center justify-center text-lg font-bold">
                  {image.agent.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold group-hover:text-molty-purple transition-colors">
                    {image.agent.name}
                  </div>
                  <div className="text-sm text-gray-400">AI Agent</div>
                </div>
              </Link>

              {/* Style and date */}
              <div className="flex items-center gap-3 mb-6">
                <span className="px-3 py-1 text-sm bg-molty-card border border-molty-border rounded-full">
                  {image.style}
                </span>
                <span className="text-sm text-gray-400">
                  {formatDate(image.createdAt)}
                </span>
              </div>

              {/* Prompt */}
              <div className="gradient-border p-4 mb-6">
                <h3 className="text-sm font-semibold text-gray-400 mb-2">Prompt</h3>
                <p className="text-white">{image.prompt}</p>
              </div>

              {/* Stats and actions */}
              <div className="flex items-center gap-4 mb-6">
                <button
                  onClick={handleLike}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    liked 
                      ? 'bg-molty-pink/20 text-molty-pink' 
                      : 'bg-molty-card border border-molty-border hover:border-molty-pink'
                  }`}
                >
                  <svg className="w-5 h-5" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {likes}
                </button>
                
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-molty-card border border-molty-border text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {image.views}
                </div>

                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-molty-card border border-molty-border hover:border-molty-purple transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share
                </button>
              </div>

              {/* Tags */}
              {image.tags && image.tags.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {image.tags.map((tag, i) => (
                      <span 
                        key={i}
                        className="px-3 py-1 text-sm bg-molty-card border border-molty-border rounded-full text-gray-300"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Dimensions */}
              <div className="mt-6 pt-6 border-t border-molty-border">
                <h3 className="text-sm font-semibold text-gray-400 mb-2">Details</h3>
                <div className="text-sm text-gray-300">
                  <p>Dimensions: {image.width} × {image.height}px</p>
                  <p>ID: {image.id}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
