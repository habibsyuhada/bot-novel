import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DetailData {
  id: string;
  url: string;
  timestamp: string;
  title: string;
  screenshot?: string;
}

export default function Detail() {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<DetailData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    // Simulasi pengambilan data
    // Dalam aplikasi nyata, ini akan mengambil data dari API
    setTimeout(() => {
      if (id === '1') {
        setData({
          id: '1',
          url: 'https://www.google.com',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          title: 'Google',
          screenshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', // Placeholder base64 image
        });
      } else if (id === '2') {
        setData({
          id: '2',
          url: 'https://www.github.com',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          title: 'GitHub: Let\'s build from here',
          screenshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', // Placeholder base64 image
        });
      } else {
        setError('Detail not found');
      }
      setLoading(false);
    }, 1000);
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="alert alert-error">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{error || 'An error occurred'}</span>
        <div>
          <Link href="/" className="btn btn-sm">Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{data.title}</h1>
        <Link href="/" className="btn btn-outline btn-sm">
          Back to Home
        </Link>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-bold">URL</span>
                </label>
                <input type="text" value={data.url} readOnly className="input input-bordered" />
              </div>
              
              <div className="form-control mt-4">
                <label className="label">
                  <span className="label-text font-bold">Title</span>
                </label>
                <input type="text" value={data.title} readOnly className="input input-bordered" />
              </div>
              
              <div className="form-control mt-4">
                <label className="label">
                  <span className="label-text font-bold">Timestamp</span>
                </label>
                <input type="text" value={new Date(data.timestamp).toLocaleString()} readOnly className="input input-bordered" />
              </div>
              
              <div className="mt-6">
                <button className="btn btn-primary mr-2">Rerun</button>
                <button className="btn btn-outline">Download Screenshot</button>
              </div>
            </div>
            
            <div>
              <label className="label">
                <span className="label-text font-bold">Screenshot</span>
              </label>
              {data.screenshot ? (
                <div className="border border-base-300 rounded-lg overflow-hidden">
                  <img 
                    src={data.screenshot} 
                    alt="Screenshot" 
                    className="w-full"
                  />
                </div>
              ) : (
                <div className="alert">
                  <span>No screenshot available</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}