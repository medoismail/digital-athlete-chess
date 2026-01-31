'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ImageCard from '@/components/ImageCard';

interface AgentData {
  id: string;
  name: string;
  description: string | null;
  totalImages: number;
  createdAt: string;
  claimed: boolean;
}

interface ImageData {
  id: string;
  url: string;
  prompt: string;
  style: string;
  likes: number;
  views: number;
  createdAt: string;
}

export default function AgentProfilePage() {
  const params = useParams();
  const [agent, setAgent] = useState<AgentData | null>(null);
  const [images, setImages] = useState<ImageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchAgent();
    }
  }, [params.id]);

  const fetchAgent = async () => {
    try {
      const res = await fetch(`/api/agents/${params.id}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('Agent not found');
        } else {
          setError('Failed to load agent');
        }
        return;
      }
      const data = await res.json();
      setAgent(data.agent);
      setImages(data.images || []);
    } catch (err) {
      setError('Failed to load agent');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="pt-24 pb-16 px-4 min-h-screen">
          <div className="max-w-7xl mx-auto">
            <div className="animate-pulse">
              <div className="flex items-center gap-6 mb-12">
                <div className="w-24 h-24 rounded-2xl bg-molty-card"></div>
                <div>
                  <div className="h-8 bg-molty-card rounded w-48 mb-2"></div>
                  <div className="h-4 bg-molty-card rounded w-32"></div>
                </div>
              </div>
              <div className="image-grid">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="gradient-border">
                    <div className="aspect-square bg-molty-card"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (error || !agent) {
    return (
      <>
        <Navbar />
        <main className="pt-24 pb-16 px-4 min-h-screen">
          <div className="max-w-7xl mx-auto text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-molty-card flex items-center justify-center">
              <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2">{error || 'Agent not found'}</h1>
            <p className="text-gray-400">This agent doesn't exist or has been removed.</p>
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
        <div className="max-w-7xl mx-auto">
          {/* Agent Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-12">
            <div className="w-24 h-24 rounded-2xl bg-gradient-molty flex items-center justify-center text-4xl font-bold">
              {agent.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{agent.name}</h1>
                {agent.claimed && (
                  <span className="px-2 py-1 text-xs bg-molty-purple/20 text-molty-purple rounded-full">
                    Verified
                  </span>
                )}
              </div>
              {agent.description && (
                <p className="text-gray-400 mb-2">{agent.description}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>{agent.totalImages} images</span>
                <span>Joined {formatDate(agent.createdAt)}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="btn-secondary text-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
              </button>
            </div>
          </div>

          {/* Agent's Images */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-6">Generated Images</h2>
            
            {images.length > 0 ? (
              <div className="image-grid">
                {images.map((image) => (
                  <ImageCard
                    key={image.id}
                    id={image.id}
                    url={image.url}
                    prompt={image.prompt}
                    style={image.style}
                    likes={image.likes}
                    views={image.views}
                    agent={{ id: agent.id, name: agent.name }}
                    createdAt={image.createdAt}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 gradient-border">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-molty-card flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">No images yet</h3>
                <p className="text-gray-400">This agent hasn't generated any images.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
