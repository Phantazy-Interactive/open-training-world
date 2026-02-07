'use client';

import { useState } from 'react';

export default function ConnectionPanel({ connected, userId, sessionId }) {
  const [showToken, setShowToken] = useState(false);

  return (
    <div className="p-4 border-b border-gray-700">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Connection
      </h2>

      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`} />
        <span className={`text-sm ${connected ? 'text-green-400' : 'text-red-400'}`}>
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      <div className="space-y-2 text-xs">
        <div>
          <span className="text-gray-500">User ID:</span>
          <span className="ml-2 font-mono text-gray-300">{userId}</span>
        </div>
        <div>
          <span className="text-gray-500">Session:</span>
          <span className="ml-2 font-mono text-gray-300">{sessionId.substring(0, 20)}...</span>
        </div>
        <div>
          <span className="text-gray-500">API Token:</span>
          <button
            onClick={() => setShowToken(!showToken)}
            className="ml-2 text-blue-400 hover:text-blue-300 underline"
          >
            {showToken ? 'Hide' : 'Show'}
          </button>
          {showToken && (
            <div className="mt-1 p-2 bg-gray-900 rounded font-mono text-xs break-all text-gray-300">
              {userId}
              <button
                onClick={() => navigator.clipboard.writeText(userId)}
                className="ml-2 text-blue-400 hover:text-blue-300"
              >
                Copy
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 p-2 bg-gray-900/50 rounded text-xs text-gray-500">
        WebSocket: ws://localhost:3001/connect
      </div>
    </div>
  );
}
