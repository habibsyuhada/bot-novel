import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

type Novel = {
  id: number;
  name: string;
  last_url_translated: string | null;
};

type BatchResult = {
  novelId: number;
  novelName: string;
  chaptersProcessed: number;
  error?: string;
};

type BatchResponse = {
  success: boolean;
  message: string;
  data?: {
    processedNovels: number;
    results: BatchResult[];
  };
  error?: string;
};

export default function BatchProcess() {
  const [selectedNovels, setSelectedNovels] = useState<number[]>([]);
  const [maxChapters, setMaxChapters] = useState('10');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BatchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [novels, setNovels] = useState<Novel[]>([]);
  const [isLoadingNovels, setIsLoadingNovels] = useState(true);

  useEffect(() => {
    const fetchNovels = async () => {
      try {
        const response = await fetch('/api/novels');
        const data = await response.json();
        
        if (data.success && data.data) {
          setNovels(data.data);
        } else {
          setError('Failed to fetch novels: ' + (data.error || 'Unknown error'));
        }
      } catch (err) {
        setError('Failed to fetch novels: ' + (err instanceof Error ? err.message : String(err)));
      } finally {
        setIsLoadingNovels(false);
      }
    };

    fetchNovels();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedNovels.length === 0) {
      setError('Please select at least one novel');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/batch-bot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          novelIds: selectedNovels,
          maxChaptersPerNovel: parseInt(maxChapters),
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || 'An error occurred');
      }
    } catch (err) {
      setError('Failed to start batch processing: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleNovelToggle = (novelId: number) => {
    setSelectedNovels(prev => 
      prev.includes(novelId)
        ? prev.filter(id => id !== novelId)
        : [...prev, novelId]
    );
  };

  const handleSelectAll = () => {
    if (selectedNovels.length === novels.length) {
      setSelectedNovels([]);
    } else {
      setSelectedNovels(novels.map(novel => novel.id));
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <Head>
        <title>Batch Novel Translation</title>
        <meta name="description" content="Batch process multiple novels for translation" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="relative py-3 sm:max-w-xl sm:mx-auto w-full px-4 sm:px-0">
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-semibold text-gray-900">Batch Novel Translation</h1>
              <p className="mt-2 text-gray-600">Process multiple novels at once</p>
              <Link href="/" className="text-blue-500 hover:text-blue-600 mt-2 inline-block">
                Back to Single Novel Mode
              </Link>
            </div>

            <div className="divide-y divide-gray-200">
              <form onSubmit={handleSubmit} className="py-8 space-y-4 text-base leading-6 text-gray-700 sm:text-lg sm:leading-7">
                <div className="relative">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-gray-600">Select Novels</label>
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-sm text-blue-500 hover:text-blue-600"
                    >
                      {selectedNovels.length === novels.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto border rounded-md p-2">
                    {isLoadingNovels ? (
                      <p className="text-center text-gray-500">Loading novels...</p>
                    ) : (
                      novels.map((novel) => (
                        <div key={novel.id} className="flex items-center space-x-2 py-1">
                          <input
                            type="checkbox"
                            id={`novel-${novel.id}`}
                            checked={selectedNovels.includes(novel.id)}
                            onChange={() => handleNovelToggle(novel.id)}
                            className="rounded text-blue-500 focus:ring-blue-500"
                          />
                          <label htmlFor={`novel-${novel.id}`} className="text-sm">
                            {novel.name} (ID: {novel.id})
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Selected: {selectedNovels.length} novel(s)
                  </p>
                </div>
                
                <div className="relative">
                  <label htmlFor="maxChapters" className="text-gray-600">Max Chapters per Novel</label>
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
                    disabled={isLoading || selectedNovels.length === 0}
                    className={`w-full px-6 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      (isLoading || selectedNovels.length === 0) ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isLoading ? 'Processing...' : 'Start Batch Translation'}
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
                    <p className="mt-2">Processed novels: {result.data?.processedNovels}</p>
                    
                    {result.data?.results && result.data.results.length > 0 && (
                      <div className="mt-4">
                        <h3 className="text-lg font-medium text-gray-700">Novel Results:</h3>
                        <div className="mt-2 space-y-3">
                          {result.data.results.map((novel, index) => (
                            <div key={index} className="p-3 bg-white rounded-lg shadow-sm">
                              <h4 className="font-medium text-gray-800">
                                {novel.novelName} (ID: {novel.novelId})
                              </h4>
                              {novel.error ? (
                                <p className="text-red-600 text-sm mt-1">
                                  Error: {novel.error}
                                </p>
                              ) : (
                                <p className="text-green-600 text-sm mt-1">
                                  Successfully processed {novel.chaptersProcessed} chapters
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
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