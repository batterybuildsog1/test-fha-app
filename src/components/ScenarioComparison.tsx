import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

function ScenarioComparison() {
  const scenarios = useQuery(api.scenarios.getAll);

  if (!scenarios || scenarios.length === 0) {
    return (
      <div className="text-center py-10 px-4 border-2 border-dashed border-neutral-200 rounded-lg">
        <p className="text-neutral-500">No saved scenarios yet.</p>
        <p className="text-sm text-neutral-400 mt-2">Your saved calculations will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {scenarios.map(s => (
        <div key={s._id} className="bg-white p-4 rounded-lg border border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-semibold text-primary-dark text-lg">
              ${s.monthlyPayment.toLocaleString()}/mo
            </h3>
            <span className="text-xs bg-secondary-light text-secondary-dark font-medium px-2 py-1 rounded-full">{s.zipCode}</span>
          </div>
          <div className="mt-3 space-y-2 text-sm text-neutral-700">
            <div className="flex justify-between"><span>House Price:</span><span className="font-medium">${s.housePrice.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>Down Payment:</span><span className="font-medium">${s.downPayment.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>Interest Rate:</span><span className="font-medium">{s.interestRate}%</span></div>
            <div className="flex justify-between"><span>Term:</span><span className="font-medium">{s.loanTerm} years</span></div>
          </div>
          <div className="mt-3 pt-3 border-t border-dashed text-xs text-neutral-600 space-y-1">
            <div className="flex justify-between"><span>P&I:</span><span className="font-medium">${s.principalInterest}</span></div>
            <div className="flex justify-between"><span>Tax:</span><span className="font-medium">${s.propertyTax}</span></div>
            <div className="flex justify-between"><span>Insurance:</span><span className="font-medium">${s.insurance}</span></div>
            {s.pmi > 0 && <div className="flex justify-between"><span>PMI:</span><span className="font-medium">${s.pmi}</span></div>}
          </div>
        </div>
      ))}
    </div>
  );
}

export default ScenarioComparison;

