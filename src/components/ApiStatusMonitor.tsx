import React from 'react';

interface ApiCall {
  id: string;
  name: string;
  status: 'pending' | 'success' | 'error';
  timestamp: number;
  duration?: number;
  error?: string;
}

interface ApiStatusMonitorProps {
  apiCalls: ApiCall[];
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

function ApiStatusMonitor({ apiCalls, isMinimized = false, onToggleMinimize }: ApiStatusMonitorProps) {
  const recentCalls = apiCalls.slice(-5);

  if (isMinimized) {
    const activeCalls = apiCalls.filter(call => call.status === 'pending');
    const hasError = apiCalls.some(call => call.status === 'error');
    
    let statusColor = 'bg-success-500';
    if (activeCalls.length > 0) statusColor = 'bg-warning-500 animate-pulse';
    else if (hasError) statusColor = 'bg-error-500';

    return (
      <div className="fixed bottom-4 right-4 bg-white border border-neutral-200 rounded-lg shadow-lg p-2 cursor-pointer" onClick={onToggleMinimize}>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${statusColor}`} />
          <span className="text-sm text-neutral-700">
            {activeCalls.length > 0 ? `${activeCalls.length} active` : 'API Status'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-neutral-200 rounded-lg shadow-lg p-4 w-80 max-h-96 overflow-y-auto text-neutral-800">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-sm text-neutral-900">API Status Monitor</h3>
        <button onClick={onToggleMinimize} className="text-neutral-500 hover:text-neutral-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      
      <div className="space-y-2">
        {recentCalls.length === 0 ? (
          <p className="text-sm text-neutral-500">No API calls yet.</p>
        ) : (
          recentCalls.map(call => (
            <div key={call.id} className="border border-neutral-200 rounded-md p-2 text-xs">
              <div className="flex justify-between items-start">
                <span className="font-medium text-neutral-800">{call.name}</span>
                <StatusBadge status={call.status} />
              </div>
              {call.duration && (
                <div className="text-neutral-500 mt-1">
                  Duration: {call.duration}ms
                </div>
              )}
              {call.error && (
                <div className="text-error-600 mt-1 font-medium">
                  {call.error}
                </div>
              )}
            </div>
          ))
        )}
      </div>
      
      <div className="mt-3 pt-3 border-t border-neutral-200 text-xs text-neutral-600">
        <div className="flex justify-between">
          <span>Total calls:</span>
          <span className="font-medium">{apiCalls.length}</span>
        </div>
        <div className="flex justify-between">
          <span>Success rate:</span>
          <span className="font-medium">
            {apiCalls.length > 0 
              ? `${Math.round((apiCalls.filter(c => c.status === 'success').length / apiCalls.length) * 100)}%`
              : 'N/A'}
          </span>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ApiCall['status'] }) {
  const statusConfig = {
    pending: { bg: 'bg-warning-100', text: 'text-warning-800', label: 'Pending' },
    success: { bg: 'bg-success-100', text: 'text-success-800', label: 'Success' },
    error: { bg: 'bg-error-100', text: 'text-error-800', label: 'Error' }
  };
  
  const config = statusConfig[status];
  
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

export default ApiStatusMonitor;
export type { ApiCall };
