import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/useAuth';
import { Card, CardContent } from '@/components/ui/Card';
import { Loader2, Video, Download, RefreshCw } from 'lucide-react';

interface Lance {
  key: string;
  name: string;
  size: number;
  lastModified: string;
  url: string;
}

function formatSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });
}

export default function LancesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [videos, setVideos] = useState<Lance[]>([]);
  const [total, setTotal] = useState(0);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setFetching(true);
    setError(null);
    fetch('/api/lances')
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erro ao carregar os lances');
        setVideos(data.videos);
        setTotal(data.total);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setFetching(false));
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) load();
  }, [user]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Lances Gardenal</h1>
          <p className="text-gray-600 mt-1">Vídeos dos lances gravados em campo</p>
        </div>
        <button
          onClick={load}
          disabled={fetching}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${fetching ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {fetching && videos.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center text-red-600">{error}</CardContent>
        </Card>
      ) : videos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Video className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            Nenhum lance enviado ainda.
          </CardContent>
        </Card>
      ) : (
        <>
          {total > videos.length && (
            <p className="text-sm text-gray-500">
              Mostrando os {videos.length} mais recentes de {total}.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {videos.map((video) => (
              <Card key={video.key}>
                <CardContent className="p-3 space-y-2">
                  <video
                    src={video.url}
                    controls
                    preload="metadata"
                    className="w-full rounded-md bg-black aspect-video"
                  />
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">{formatDate(video.lastModified)}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {video.name} · {formatSize(video.size)}
                      </p>
                    </div>
                    <a
                      href={video.url}
                      download={video.name}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                      title="Baixar"
                    >
                      <Download className="h-5 w-5" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}