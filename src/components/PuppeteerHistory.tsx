import { useState, useEffect } from 'react';
import Link from 'next/link';

interface HistoryItem {
  id: string;
  url: string;
  timestamp: string;
  title: string;
  screenshotUrl?: string;
}

const PuppeteerHistory = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  // Simulasi data riwayat
  useEffect(() => {
    // Dalam aplikasi nyata, ini akan mengambil data dari API atau localStorage
    const mockHistory: HistoryItem[] = [
      {
        id: '1',
        url: 'https://www.google.com',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        title: 'Google',
      },
      {
        id: '2',
        url: 'https://www.github.com',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        title: 'GitHub: Let\'s build from here',
      },
    ];
    
    setHistory(mockHistory);
  }, []);
  
  if (history.length === 0) {
    return (
      <div className="card w-full bg-base-100 shadow-xl mt-8">
        <div className="card-body">
          <h2 className="card-title">History</h2>
          <p className="text-gray-500">No history available yet.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="card w-full bg-base-100 shadow-xl mt-8">
      <div className="card-body">
        <h2 className="card-title">History</h2>
        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>URL</th>
                <th>Title</th>
                <th>Timestamp</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id}>
                  <td className="truncate max-w-xs">{item.url}</td>
                  <td>{item.title}</td>
                  <td>{new Date(item.timestamp).toLocaleString()}</td>
                  <td>
                    <button className="btn btn-xs btn-primary mr-2">Rerun</button>
                    <Link href={`/detail/${item.id}`} className="btn btn-xs btn-ghost">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PuppeteerHistory; 