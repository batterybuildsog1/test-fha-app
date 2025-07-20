/**
 * Borrowing Power Summary Component
 * 
 * Displays key borrowing power metrics using actual domain types and interfaces.
 */

import React from 'react';
import { TrendingUp, Home, DollarSign, Calculator, PiggyBank, CreditCard } from 'lucide-react';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';

interface BorrowingPowerSummaryProps {
  maxPurchasePrice: number;
  maxLoanAmount: number;
  maxPITI: number;
  recommendedPrice: number | null;
  safePrice: number | null;
  totalCashNeeded: number;
  variant?: 'default' | 'compact' | 'detailed';
}

export const BorrowingPowerSummary: React.FC<BorrowingPowerSummaryProps> = ({
  maxPurchasePrice,
  maxLoanAmount,
  maxPITI,
  recommendedPrice,
  safePrice,
  totalCashNeeded,
  variant = 'default',
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const isCompact = variant === 'compact';
  const isDetailed = variant === 'detailed';

  if (isCompact) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3">
          <div className="text-center">
            <div className="text-lg font-bold text-primary">
              {formatCurrency(maxPurchasePrice)}
            </div>
            <div className="text-xs text-muted-foreground">Max Purchase</div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">
              {formatCurrency(maxPITI)}
            </div>
            <div className="text-xs text-muted-foreground">Max Payment</div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Maximum Purchase Price */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Home className="w-5 h-5 text-primary" />
              <Badge variant="outline" className="text-xs">
                Max Purchase
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(maxPurchasePrice)}
              </div>
              <div className="text-sm text-muted-foreground">
                Total home price you can afford
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Maximum Loan Amount */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <Badge variant="outline" className="text-xs">
                Max Loan
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(maxLoanAmount)}
              </div>
              <div className="text-sm text-muted-foreground">
                Maximum loan amount available
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Maximum Monthly Payment */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Calculator className="w-5 h-5 text-green-600" />
              <Badge variant="outline" className="text-xs">
                Max Payment
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(maxPITI)}
              </div>
              <div className="text-sm text-muted-foreground">
                Maximum monthly PITI payment
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics (for detailed view) */}
      {isDetailed && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Recommended Price */}
          <Card className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-5 h-5 text-orange-600" />
                <Badge variant="outline" className="text-xs">
                  Recommended
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="text-xl font-bold text-orange-600">
                  {formatCurrency(recommendedPrice || 0)}
                </div>
                <div className="text-sm text-muted-foreground">
                  85% of max for safety
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Safe Price */}
          <Card className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <PiggyBank className="w-5 h-5 text-teal-600" />
                <Badge variant="outline" className="text-xs">
                  Conservative
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="text-xl font-bold text-teal-600">
                  {formatCurrency(safePrice || 0)}
                </div>
                <div className="text-sm text-muted-foreground">
                  75% of max for peace of mind
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Cash Needed */}
          <Card className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <CreditCard className="w-5 h-5 text-purple-600" />
                <Badge variant="outline" className="text-xs">
                  Cash Needed
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="text-xl font-bold text-purple-600">
                  {formatCurrency(totalCashNeeded)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Down payment + closing costs
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Price Comparison (for default and detailed views) */}
      {variant !== 'compact' && recommendedPrice && safePrice && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-3">Price Range Comparison</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-teal-600">Conservative (75%)</span>
              <span className="font-medium">{formatCurrency(safePrice)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-orange-600">Recommended (85%)</span>
              <span className="font-medium">{formatCurrency(recommendedPrice)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-primary">Maximum (100%)</span>
              <span className="font-medium">{formatCurrency(maxPurchasePrice)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BorrowingPowerSummary;