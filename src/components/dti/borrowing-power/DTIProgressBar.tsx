/**
 * DTI Progress Bar Component
 * 
 * Visualizes DTI ratios using actual domain types and proper interfaces.
 */

import React from 'react';
import { TrendingDown, DollarSign, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Progress } from '../../ui/progress';
import { Badge } from '../../ui/badge';
import { Card, CardContent } from '../../ui/card';
import { DTIResponse } from '../../../convex/domain/types';

interface DTIProgressBarProps {
  dtiResponse: DTIResponse;
  monthlyIncome: number;
  monthlyDebts: number;
  maxPITI: number;
  dtiMargin: number | null;
  frontEndDTI: number | null;
  backEndDTI: number | null;
}

export const DTIProgressBar: React.FC<DTIProgressBarProps> = ({
  dtiResponse,
  monthlyIncome,
  monthlyDebts,
  maxPITI,
  dtiMargin,
  frontEndDTI,
  backEndDTI,
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const { allowed, actual, strongFactorCount, flags } = dtiResponse;
  const availableForHousing = maxPITI;
  const dtiUtilization = (actual.backEnd / allowed.backEnd) * 100;
  const debtUtilization = (monthlyDebts / monthlyIncome) * 100;
  const housingCapacity = (maxPITI / monthlyIncome) * 100;

  const getDTIStatusColor = (utilization: number) => {
    if (utilization <= 70) return 'text-green-600';
    if (utilization <= 90) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getDTIStatusIcon = (utilization: number) => {
    if (utilization <= 70) return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (utilization <= 90) return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    return <AlertTriangle className="w-4 h-4 text-red-600" />;
  };

  const getStatusMessage = () => {
    if (flags.includes('withinLimits')) {
      return 'Your DTI is within acceptable limits';
    } else if (flags.includes('exceedsFrontEnd')) {
      return 'Front-end DTI exceeds recommended limits';
    } else if (flags.includes('exceedsBackEnd')) {
      return 'Back-end DTI exceeds recommended limits';
    }
    return 'DTI status unknown';
  };

  return (
    <div className="space-y-4">
      {/* DTI Overview */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="font-medium">DTI Analysis</h4>
          {getDTIStatusIcon(dtiUtilization)}
        </div>
        <Badge variant="outline" className={getDTIStatusColor(dtiUtilization)}>
          {actual.backEnd.toFixed(1)}% / {allowed.backEnd.toFixed(1)}%
        </Badge>
      </div>

      {/* Status Message */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Info className="w-4 h-4" />
        <span>{getStatusMessage()}</span>
      </div>

      {/* Income Allocation Visualization */}
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span>Monthly Income: {formatCurrency(monthlyIncome)}</span>
          <span>Available for Housing: {formatCurrency(availableForHousing)}</span>
        </div>
        
        {/* Multi-segment progress bar */}
        <div className="relative">
          <Progress value={dtiUtilization} className="h-4" />
          <div 
            className="absolute top-0 left-0 h-4 bg-red-500 rounded-l-sm"
            style={{ width: `${Math.min(debtUtilization, 100)}%` }}
          />
          <div 
            className="absolute top-0 h-4 bg-blue-500"
            style={{ 
              left: `${Math.min(debtUtilization, 100)}%`,
              width: `${Math.min(housingCapacity, 100 - Math.min(debtUtilization, 100))}%` 
            }}
          />
        </div>

        <div className="flex justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-sm" />
            <span>Existing Debts: {formatCurrency(monthlyDebts)}</span>
            <span className="text-muted-foreground">({debtUtilization.toFixed(1)}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-sm" />
            <span>Housing Capacity: {formatCurrency(maxPITI)}</span>
            <span className="text-muted-foreground">({housingCapacity.toFixed(1)}%)</span>
          </div>
        </div>
      </div>

      {/* DTI Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Front-End DTI</span>
                <Badge variant="outline" className="text-xs">
                  {actual.frontEnd.toFixed(1)}% / {allowed.frontEnd.toFixed(1)}%
                </Badge>
              </div>
              <Progress value={(actual.frontEnd / allowed.frontEnd) * 100} className="h-2" />
              <div className="text-xs text-muted-foreground">
                Housing payment to income ratio
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Back-End DTI</span>
                <Badge variant="outline" className="text-xs">
                  {actual.backEnd.toFixed(1)}% / {allowed.backEnd.toFixed(1)}%
                </Badge>
              </div>
              <Progress value={(actual.backEnd / allowed.backEnd) * 100} className="h-2" />
              <div className="text-xs text-muted-foreground">
                Total debt to income ratio
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Strong Factors & Margin */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Strong Factors</span>
            <Badge variant={strongFactorCount >= 2 ? 'default' : 'secondary'} className="text-xs">
              {strongFactorCount}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            {strongFactorCount >= 2 
              ? 'Excellent profile with strong compensating factors' 
              : 'Consider strengthening your profile with additional factors'
            }
          </div>
        </div>

        {dtiMargin !== null && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">DTI Headroom</span>
              <Badge variant="outline" className="text-xs">
                {dtiMargin.toFixed(1)}%
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              {dtiMargin > 10 
                ? 'Excellent headroom for additional borrowing' 
                : dtiMargin > 5 
                  ? 'Good headroom available'
                  : 'Limited headroom - consider debt reduction'
              }
            </div>
          </div>
        )}
      </div>

      {/* Calculation Details */}
      <div className="p-3 bg-blue-50 rounded-lg">
        <h5 className="text-sm font-medium mb-2">Key Metrics</h5>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Max Housing Payment:</span>
            <span className="font-medium ml-2">{formatCurrency(dtiResponse.calculationDetails.maxHousingPayment)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Available After Debts:</span>
            <span className="font-medium ml-2">{formatCurrency(dtiResponse.calculationDetails.availableAfterDebts)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DTIProgressBar;