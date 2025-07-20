import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { ScenarioListProps } from '../types';

function ScenarioList({ onEditScenario, onViewScenario }: ScenarioListProps) {
  const scenarios = useQuery(api.scenarios.getAll);
  const deleteScenario = useMutation(api.scenarios.deleteScenario);
  const archiveScenario = useMutation(api.scenarios.archiveScenario);
  
  const [deleteConfirm, setDeleteConfirm] = useState<Id<"scenarios"> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (id: Id<"scenarios">) => {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 3000);
      return;
    }
    
    setIsDeleting(true);
    try {
      await deleteScenario({ id });
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete scenario:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 0 
    }).format(amount);
  };

  if (scenarios === undefined) {
    return (
      <div className="text-center py-12 px-4">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-500">Loading scenarios...</p>
      </div>
    );
  }

  if (scenarios.length === 0) {
    return (
      <div className="text-center py-12 px-4 border-2 border-dashed border-neutral-200 rounded-lg">
        <div className="text-gray-400 text-6xl mb-4">📊</div>
        <p className="text-neutral-500 text-lg font-medium">No saved scenarios yet</p>
        <p className="text-sm text-neutral-400 mt-2">Create your first scenario to get started with comparisons</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Saved Scenarios</h3>
        <span className="text-sm text-gray-500">{scenarios.length} scenario{scenarios.length !== 1 ? 's' : ''}</span>
      </div>
      
      <div className="grid gap-4 overflow-y-auto max-h-[80vh]">
        {scenarios.map(scenario => (
          <div key={scenario._id} className="bg-white p-4 rounded-lg border border-neutral-200 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 text-lg">
                  {scenario.name || 'Unnamed Scenario'}
                </h4>
                {scenario.description && (
                  <p className="text-sm text-gray-500 mt-1">
                    {scenario.description}
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => onViewScenario(scenario._id)}
                  className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                >
                  View
                </button>
                <button
                  onClick={() => onEditScenario(scenario._id)}
                  className="px-3 py-1 text-xs bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(scenario._id)}
                  disabled={isDeleting}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    deleteConfirm === scenario._id
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                  } ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {deleteConfirm === scenario._id ? 'Confirm' : 'Delete'}
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500 block">House Price</span>
                <p className="font-medium">{formatCurrency(scenario.housePrice)}</p>
              </div>
              <div>
                <span className="text-gray-500 block">Monthly Payment</span>
                <p className="font-medium text-lg text-indigo-600">{formatCurrency(scenario.monthlyPayment)}</p>
              </div>
              <div>
                <span className="text-gray-500 block">Down Payment</span>
                <p className="font-medium">{formatCurrency(scenario.downPayment)}</p>
              </div>
              <div>
                <span className="text-gray-500 block">Interest Rate</span>
                <p className="font-medium">{scenario.interestRate}%</p>
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600">
                <div>
                  <span>P&I: {formatCurrency(scenario.principalInterest)}</span>
                </div>
                <div>
                  <span>Tax: {formatCurrency(scenario.propertyTax)}</span>
                </div>
                <div>
                  <span>Insurance: {formatCurrency(scenario.insurance)}</span>
                </div>
                {scenario.pmi > 0 && (
                  <div>
                    <span>PMI: {formatCurrency(scenario.pmi)}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-3 flex justify-between items-center text-xs text-gray-500">
              <span>ZIP: {scenario.zipCode} • {scenario.loanTerm} years</span>
              <span>Updated: {formatDate(scenario.updatedAt)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ScenarioList;