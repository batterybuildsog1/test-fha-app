/**
 * Debt Impact Analysis Component
 * 
 * Shows how each debt category affects borrowing power using proper domain types.
 */

import React from 'react';
import { Car, CreditCard, GraduationCap, User, Plus, TrendingDown, Lightbulb } from 'lucide-react';
import { Progress } from '../../ui/progress';
import { Badge } from '../../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { DebtItems } from '../../../convex/domain/types';

// Import the BorrowingPowerAnalysis interface from the hook
interface BorrowingPowerAnalysis {
  maxPurchasePrice: number;
  maxLoanAmount: number;
  requiredDownPayment: number;
  estimatedClosingCosts: number;
  totalCashNeeded: number;
  monthlyPaymentBreakdown: {
    principal: number;
    interest: number;
    taxes: number;
    insurance: number;
    pmi?: number;
    total: number;
  };
  affordabilityRating: 'excellent' | 'good' | 'fair' | 'poor';
  recommendations: string[];
}

interface DebtImpactAnalysisProps {
  debtItems: DebtItems;
  monthlyIncome: number;
  maxPurchasePrice: number;
  analysis: BorrowingPowerAnalysis | null;
}

interface DebtImpactItem {
  key: keyof DebtItems;
  name: string;
  icon: React.ReactNode;
  amount: number;
  color: string;
  impactLevel: 'low' | 'medium' | 'high';
  description: string;
}

export const DebtImpactAnalysis: React.FC<DebtImpactAnalysisProps> = ({
  debtItems,
  monthlyIncome,
  maxPurchasePrice,
  analysis,
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate debt impact items
  const debtImpacts: DebtImpactItem[] = React.useMemo(() => {
    const impacts: DebtImpactItem[] = [];
    const totalDebts = Object.values(debtItems).reduce((sum, amount) => sum + amount, 0);

    if (debtItems.carLoan > 0) {
      impacts.push({
        key: 'carLoan',
        name: 'Car Loan',
        icon: <Car className="w-4 h-4" />,
        amount: debtItems.carLoan,
        color: 'bg-blue-500',
        impactLevel: debtItems.carLoan > totalDebts * 0.3 ? 'high' : debtItems.carLoan > totalDebts * 0.15 ? 'medium' : 'low',
        description: 'Monthly auto loan payment',
      });
    }

    if (debtItems.studentLoan > 0) {
      impacts.push({
        key: 'studentLoan',
        name: 'Student Loans',
        icon: <GraduationCap className="w-4 h-4" />,
        amount: debtItems.studentLoan,
        color: 'bg-purple-500',
        impactLevel: debtItems.studentLoan > totalDebts * 0.3 ? 'high' : debtItems.studentLoan > totalDebts * 0.15 ? 'medium' : 'low',
        description: 'Monthly student loan payment',
      });
    }

    if (debtItems.creditCard > 0) {
      impacts.push({
        key: 'creditCard',
        name: 'Credit Cards',
        icon: <CreditCard className="w-4 h-4" />,
        amount: debtItems.creditCard,
        color: 'bg-red-500',
        impactLevel: debtItems.creditCard > totalDebts * 0.2 ? 'high' : debtItems.creditCard > totalDebts * 0.1 ? 'medium' : 'low',
        description: 'Minimum credit card payments',
      });
    }

    if (debtItems.personalLoan > 0) {
      impacts.push({
        key: 'personalLoan',
        name: 'Personal Loans',
        icon: <User className="w-4 h-4" />,
        amount: debtItems.personalLoan,
        color: 'bg-orange-500',
        impactLevel: debtItems.personalLoan > totalDebts * 0.3 ? 'high' : debtItems.personalLoan > totalDebts * 0.15 ? 'medium' : 'low',
        description: 'Monthly personal loan payment',
      });
    }

    if (debtItems.otherDebt > 0) {
      impacts.push({
        key: 'otherDebt',
        name: 'Other Debts',
        icon: <Plus className="w-4 h-4" />,
        amount: debtItems.otherDebt,
        color: 'bg-gray-500',
        impactLevel: debtItems.otherDebt > totalDebts * 0.3 ? 'high' : debtItems.otherDebt > totalDebts * 0.15 ? 'medium' : 'low',
        description: 'Other monthly debt obligations',
      });
    }

    return impacts.sort((a, b) => b.amount - a.amount);
  }, [debtItems]);

  const totalDebts = Object.values(debtItems).reduce((sum, amount) => sum + amount, 0);

  // Calculate borrowing power impact (using DTI multiplier)
  const calculateBorrowingPowerReduction = (debtAmount: number) => {
    // Rule of thumb: $1 of monthly debt reduces borrowing power by ~$200-300
    // This is a conservative estimate based on typical DTI ratios
    return debtAmount * 250;
  };

  const getImpactBadgeColor = (impactLevel: 'low' | 'medium' | 'high') => {
    switch (impactLevel) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getOptimizationTips = () => {
    const tips: string[] = [];
    
    if (debtItems.creditCard > 0) {
      tips.push('Pay down high-interest credit card debt first');
    }
    
    if (debtItems.carLoan > monthlyIncome * 0.15) {
      tips.push('Consider a less expensive vehicle to reduce monthly payments');
    }
    
    if (debtItems.studentLoan > 0) {
      tips.push('Explore income-driven repayment plans for student loans');
    }
    
    if (totalDebts > monthlyIncome * 0.36) {
      tips.push('Consider debt consolidation to reduce monthly payments');
    }
    
    return tips;
  };

  if (debtImpacts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingDown className="w-4 h-4" />
            Debt Impact Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="text-green-600 mb-2">🎉</div>
            <p className="text-sm text-muted-foreground">
              No monthly debts detected. Your full borrowing power is available!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4" />
            Debt Impact Analysis
          </div>
          <Badge variant="outline" className="text-xs">
            Total: {formatCurrency(totalDebts)}/mo
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Impact Summary */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Total Borrowing Power Impact</span>
            <span className="text-sm text-red-600 font-medium">
              -{formatCurrency(calculateBorrowingPowerReduction(totalDebts))}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Estimated reduction in maximum loan amount
          </div>
          <div className="text-xs text-muted-foreground">
            DTI Impact: {((totalDebts / monthlyIncome) * 100).toFixed(1)}% of monthly income
          </div>
        </div>

        {/* Individual Debt Impacts */}
        <div className="space-y-3">
          {debtImpacts.map((debt) => {
            const impactReduction = calculateBorrowingPowerReduction(debt.amount);
            const impactPercentage = totalDebts > 0 ? (debt.amount / totalDebts) * 100 : 0;
            const incomePercentage = (debt.amount / monthlyIncome) * 100;

            return (
              <div key={debt.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded ${debt.color} text-white`}>
                      {debt.icon}
                    </div>
                    <div>
                      <span className="text-sm font-medium">{debt.name}</span>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ml-2 ${getImpactBadgeColor(debt.impactLevel)}`}
                      >
                        {debt.impactLevel} impact
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-medium">{formatCurrency(debt.amount)}/mo</div>
                    <div className="text-xs text-red-600">
                      -{formatCurrency(impactReduction)}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <Progress value={impactPercentage} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{impactPercentage.toFixed(1)}% of total debt</span>
                    <span>{incomePercentage.toFixed(1)}% of income</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Analysis Insights */}
        {analysis && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <h5 className="text-sm font-medium mb-2">💡 Analysis Insights</h5>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Affordability Rating:</span>
                <Badge variant={analysis.affordabilityRating === 'excellent' ? 'default' : 'secondary'}>
                  {analysis.affordabilityRating}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total Monthly Payment:</span>
                <span className="font-medium">{formatCurrency(analysis.monthlyPaymentBreakdown.total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Cash Needed at Closing:</span>
                <span className="font-medium">{formatCurrency(analysis.totalCashNeeded)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Optimization Tips */}
        {getOptimizationTips().length > 0 && (
          <div className="p-3 bg-green-50 rounded-lg">
            <h5 className="text-sm font-medium mb-2 flex items-center gap-1">
              <Lightbulb className="w-4 h-4" />
              Optimization Tips
            </h5>
            <ul className="text-xs text-muted-foreground space-y-1">
              {getOptimizationTips().map((tip, index) => (
                <li key={index}>• {tip}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations from Analysis */}
        {analysis && analysis.recommendations.length > 0 && (
          <div className="p-3 bg-orange-50 rounded-lg">
            <h5 className="text-sm font-medium mb-2">📋 Recommendations</h5>
            <ul className="text-xs text-muted-foreground space-y-1">
              {analysis.recommendations.map((recommendation, index) => (
                <li key={index}>• {recommendation}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DebtImpactAnalysis;