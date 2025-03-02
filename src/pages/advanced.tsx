import { useState } from 'react';

export default function Advanced() {
  const [script, setScript] = useState<string>(`// Contoh script Puppeteer
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.goto('https://example.com');
const title = await page.title();
const screenshot = await page.screenshot();
await browser.close();
return { title, screenshot };`);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Simulasi eksekusi script
      // Dalam aplikasi nyata, ini akan mengirim script ke API untuk dieksekusi
      setTimeout(() => {
        setResult({
          success: true,
          message: 'Script executed successfully',
          data: {
            title: 'Example Domain',
            screenshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', // Placeholder base64 image
          }
        });
        setLoading(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Advanced Puppeteer</h1>
      <p className="text-gray-600">Write and execute custom Puppeteer scripts</p>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Custom Script</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Puppeteer Script</span>
              </label>
              <textarea 
                className="textarea textarea-bordered font-mono h-64"
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="Write your Puppeteer script here..."
              />
              <label className="label">
                <span className="label-text-alt">Use JavaScript with Puppeteer API</span>
              </label>
            </div>
            
            <div className="form-control mt-4">
              <button 
                type="submit" 
                className={`btn btn-primary ${loading ? 'loading' : ''}`}
                disabled={loading}
              >
                {loading ? 'Executing...' : 'Execute Script'}
              </button>
            </div>
          </form>

          {error && (
            <div className="alert alert-error mt-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="mt-6 space-y-4">
              <div className="alert alert-success">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{result.message}</span>
              </div>
              
              <div className="card bg-base-200">
                <div className="card-body">
                  <h3 className="card-title">Result</h3>
                  <pre className="bg-base-300 p-4 rounded-lg overflow-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                  
                  {result.data.screenshot && (
                    <div className="mt-4">
                      <h4 className="font-bold mb-2">Screenshot</h4>
                      <div className="border border-base-300 rounded-lg overflow-hidden">
                        <img 
                          src={result.data.screenshot} 
                          alt="Screenshot" 
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 