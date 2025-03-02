import { useState } from 'react';
import Head from 'next/head';

// Define types for API response
type ChapterResult = {
  chapter: number;
  title: string;
  url: string;
  saved: boolean;
  skipped?: boolean;
  error?: string;
};

type BotResponse = {
  success: boolean;
  message: string;
  data?: {
    processedChapters: number;
    results: ChapterResult[];
  };
  error?: string;
};

export default function Home() {
  const [url, setUrl] = useState('');
  const [novelId, setNovelId] = useState('');
  const [maxChapters, setMaxChapters] = useState('10');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BotResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!novelId) {
      setError('Novel ID is required');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/bot?url=${encodeURIComponent(url)}&maxChapters=${maxChapters}&novelId=${novelId}`);
      const data = await response.json();
      
      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || 'An error occurred');
      }
    } catch (err) {
      setError('Failed to start the bot: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <Head>
        <title>Novel Translation Bot</title>
        <meta name="description" content="Bot for translating novels to Indonesian" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          <div className="max-w-md mx-auto">
            <div className="text-center">
              <h1 className="text-3xl font-semibold text-gray-900">Novel Translation Bot</h1>
              <p className="mt-2 text-gray-600">Enter a novel URL to translate chapters to Indonesian</p>
            </div>

            <div className="divide-y divide-gray-200">
              <form onSubmit={handleSubmit} className="py-8 space-y-4 text-base leading-6 text-gray-700 sm:text-lg sm:leading-7">
                <div className="relative">
                  <label htmlFor="novelId" className="text-gray-600">Novel ID</label>
                  <input
                    id="novelId"
                    type="number"
                    value={novelId}
                    onChange={(e) => setNovelId(e.target.value)}
                    placeholder="Enter the novel ID from your database"
                    required
                    className="w-full px-4 py-2 mt-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">This should match an existing ID in the novel table</p>
                </div>
                
                <div className="relative">
                  <label htmlFor="url" className="text-gray-600">Novel URL</label>
                  <input
                    id="url"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://novelbin.com/b/novel-name/chapter-1"
                    required
                    className="w-full px-4 py-2 mt-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="relative">
                  <label htmlFor="maxChapters" className="text-gray-600">Max Chapters</label>
                  <input
                    id="maxChapters"
                    type="number"
                    min="1"
                    max="1000"
                    value={maxChapters}
                    onChange={(e) => setMaxChapters(e.target.value)}
                    className="w-full px-4 py-2 mt-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="relative pt-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full px-6 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isLoading ? 'Processing...' : 'Start Translation'}
                  </button>
                </div>
              </form>

              {error && (
                <div className="p-4 mt-4 text-red-700 bg-red-100 rounded-md">
                  <p>{error}</p>
                </div>
              )}

              {result && (
                <div className="py-4">
                  <h2 className="text-xl font-semibold text-gray-800">Results</h2>
                  <div className="mt-2 p-4 bg-gray-50 rounded-md">
                    <p className="text-green-600 font-medium">{result.message}</p>
                    <p className="mt-2">Processed chapters: {result.data?.processedChapters}</p>
                    
                    {result.data?.results && result.data.results.length > 0 && (
                      <div className="mt-4">
                        <h3 className="text-lg font-medium text-gray-700">Chapters:</h3>
                        <ul className="mt-2 space-y-2">
                          {result.data?.results.map((chapter: ChapterResult, index: number) => (
                            <li key={index} className="p-2 bg-white rounded shadow-sm">
                              <span className="font-medium">Chapter {chapter.chapter}: </span>
                              {chapter.title}
                              {chapter.saved && (
                                <span className="ml-2 text-sm text-green-600">✓ Saved</span>
                              )}
                              {chapter.skipped && (
                                <span className="ml-2 text-sm text-yellow-600">⚠ Skipped (Already exists)</span>
                              )}
                              {!chapter.saved && !chapter.skipped && (
                                <span className="ml-2 text-sm text-red-600">❌ Failed{chapter.error ? `: ${chapter.error}` : ''}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
