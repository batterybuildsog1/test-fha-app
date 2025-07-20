import React, { useState } from 'react';
import { useConvex } from 'convex/react';
import InputForm from './components/InputForm';
import ScenarioList from './components/ScenarioList';
import ApiStatusMonitor, { ApiCall } from './components/ApiStatusMonitor';
import { DTIProvider } from './context/DTIContext';
import { Id } from '../convex/_generated/dataModel';
import { ScenarioData } from './types';

function App() {
  const convex = useConvex();
  const [apiCalls, setApiCalls] = useState<ApiCall[]>([]);
  const [isApiMonitorMinimized, setIsApiMonitorMinimized] = useState(true);
  
  // Scenario management state
  const [scenarioMode, setScenarioMode] = useState<'create' | 'edit' | 'view'>('create');
  const [activeScenarioId, setActiveScenarioId] = useState<Id<"scenarios"> | null>(null);

  // Function to track API calls
  const trackApiCall = (name: string, id?: string) => {
    const callId = id || `${name}-${Date.now()}`;
    
    return {
      start: () => {
        setApiCalls(prev => [...prev, {
          id: callId,
          name,
          status: 'pending' as const,
          timestamp: Date.now()
        }]);
      },
      success: (duration?: number) => {
        setApiCalls(prev => prev.map(call => 
          call.id === callId 
            ? { ...call, status: 'success' as const, duration: duration || Date.now() - call.timestamp }
            : call
        ));
      },
      error: (error: string, duration?: number) => {
        setApiCalls(prev => prev.map(call => 
          call.id === callId 
            ? { ...call, status: 'error' as const, error, duration: duration || Date.now() - call.timestamp }
            : call
        ));
      }
    };
  };

  // Scenario management handlers
  const handleEditScenario = (id: Id<"scenarios">) => {
    setActiveScenarioId(id);
    setScenarioMode('edit');
  };

  const handleViewScenario = (id: Id<"scenarios">) => {
    setActiveScenarioId(id);
    setScenarioMode('view');
  };

  const handleCreateNewScenario = () => {
    setActiveScenarioId(null);
    setScenarioMode('create');
  };

  const handleScenarioSaved = (scenario: ScenarioData) => {
    // After saving, switch to create mode
    setActiveScenarioId(null);
    setScenarioMode('create');
  };

  const handleCancelAction = () => {
    setActiveScenarioId(null);
    setScenarioMode('create');
  };

  return (
    <DTIProvider>
      <div className="min-h-screen bg-neutral-100 text-neutral-800">
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-6xl">
          <header className="mb-10 text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-primary-dark mb-2">FHA Mortgage Calculator</h1>
            <p className="text-lg text-neutral-600">
              An intelligent calculator using real-time data to estimate your monthly payments.
            </p>
            
            {/* Action buttons */}
            <div className="mt-6 flex justify-center">
              <button
                onClick={handleCreateNewScenario}
                className="px-6 py-2 rounded-lg font-medium transition-all bg-green-600 text-white hover:bg-green-700 shadow-lg"
              >
                + New Scenario
              </button>
            </div>
          </header>
          
          <main className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3 bg-white rounded-xl shadow-lg p-6 md:p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-neutral-800">
                  {scenarioMode === 'create' && 'Calculate New Scenario'}
                  {scenarioMode === 'edit' && 'Edit Scenario'}
                  {scenarioMode === 'view' && 'View Scenario'}
                </h2>
                {scenarioMode !== 'create' && (
                  <div className="flex items-center space-x-4">
                    {scenarioMode === 'view' && (
                      <button
                        onClick={() => setScenarioMode('edit')}
                        className="text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Edit This Scenario
                      </button>
                    )}
                    <button
                      onClick={handleCancelAction}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              <InputForm 
                trackApiCall={trackApiCall}
                scenarioId={activeScenarioId}
                mode={scenarioMode}
                onScenarioSaved={handleScenarioSaved}
                onCancel={handleCancelAction}
              />
            </div>
            
            <div className="lg:col-span-1 bg-white rounded-xl shadow-lg p-6 md:p-8">
              <h2 className="text-xl font-semibold mb-6 text-neutral-800">Saved Scenarios</h2>
              <ScenarioList 
                onEditScenario={handleEditScenario}
                onViewScenario={handleViewScenario}
              />
            </div>
          </main>
        </div>

        <ApiStatusMonitor 
          apiCalls={apiCalls}
          isMinimized={isApiMonitorMinimized}
          onToggleMinimize={() => setIsApiMonitorMinimized(!isApiMonitorMinimized)}
        />
      </div>
    </DTIProvider>
  );
}

export default App;
