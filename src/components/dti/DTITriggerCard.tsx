import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calculator,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Info,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Home,
  DollarSign,
  Percent
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type DTIStatus = 'not-started' | 'completed' | 'needs-update';

interface DTITriggerCardProps {
  onCalculate: () => void;
  status: DTIStatus;
  dtiValue?: number;
  lastUpdated?: Date;
}

export function DTITriggerCard({ 
  onCalculate, 
  status, 
  dtiValue,
  lastUpdated 
}: DTITriggerCardProps) {
  const [showAdvancedInfo, setShowAdvancedInfo] = useState(false);
  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'needs-update':
        return <AlertCircle className="w-5 h-5 text-amber-600" />;
      default:
        return <Calculator className="w-5 h-5 text-blue-600" />;
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Calculated</Badge>;
      case 'needs-update':
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Update Needed</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Not Started</Badge>;
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <CardTitle className="text-lg sm:text-xl">Debt-to-Income Ratio (DTI)</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm p-4">
                  <div className="space-y-2">
                    <p className="font-semibold text-sm">What is DTI?</p>
                    <p className="text-sm">
                      Debt-to-Income (DTI) ratio compares your monthly debt payments to your gross monthly income. 
                      It's expressed as a percentage and helps lenders assess your ability to manage monthly payments.
                    </p>
                    <div className="border-t pt-2 mt-2">
                      <p className="font-semibold text-sm mb-1">DTI Limits by Loan Type:</p>
                      <ul className="text-sm space-y-1">
                        <li>• <span className="font-medium">FHA:</span> Up to 43% (sometimes 57% with compensating factors)</li>
                        <li>• <span className="font-medium">Conventional:</span> Typically 36-43%</li>
                        <li>• <span className="font-medium">VA:</span> Up to 41%</li>
                      </ul>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {status === 'not-started' && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-blue-900">
                    Ready to calculate your DTI? Here's what you'll discover:
                  </p>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li className="flex items-start gap-1">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>Your exact borrowing power for FHA and conventional loans</span>
                    </li>
                    <li className="flex items-start gap-1">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>Whether you qualify for your desired loan amount</span>
                    </li>
                    <li className="flex items-start gap-1">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>Personalized tips to improve your DTI if needed</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Simple example for first-time users */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-900 mb-2">
                Simple Example:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-gray-600">Monthly Income</p>
                    <p className="font-medium">$5,000</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-gray-600">Monthly Debts</p>
                    <p className="font-medium">$1,500</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-gray-600">DTI Ratio</p>
                    <p className="font-medium text-green-600">30%</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                This person would likely qualify for most loan programs!
              </p>
            </div>

            {/* Progressive disclosure - show more details */}
            <button
              onClick={() => setShowAdvancedInfo(!showAdvancedInfo)}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
            >
              {showAdvancedInfo ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Show less information
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Learn more about DTI calculation
                </>
              )}
            </button>

            {showAdvancedInfo && (
              <div className="space-y-4 pt-2">
                <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-sm text-gray-900">What counts as monthly debt?</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Credit card minimum payments</li>
                    <li>• Auto loans</li>
                    <li>• Student loans</li>
                    <li>• Personal loans</li>
                    <li>• Child support or alimony</li>
                    <li>• Any other recurring debt obligations</li>
                  </ul>
                  <p className="text-xs text-gray-500 italic">
                    Note: Utilities, groceries, and other living expenses are NOT included in DTI calculations.
                  </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-sm text-gray-900">The calculation process is simple:</h4>
                  <ol className="text-sm text-gray-600 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="font-medium text-blue-600">1.</span>
                      <span>Enter your annual income (we'll calculate monthly)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-medium text-blue-600">2.</span>
                      <span>Add up your monthly debt payments</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-medium text-blue-600">3.</span>
                      <span>We'll calculate your DTI and show your options</span>
                    </li>
                  </ol>
                  <p className="text-sm text-gray-700 font-medium">
                    Takes less than 5 minutes!
                  </p>
                </div>
              </div>
            )}
            
            <Button 
              onClick={onCalculate}
              size="lg"
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white touch-manipulation active:scale-95 transition-transform"
            >
              <Calculator className="w-4 h-4 mr-2" />
              Start DTI Calculator
            </Button>
          </>
        )}

        {status === 'completed' && (
          <>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-green-900">
                    Your DTI has been calculated
                  </p>
                  {dtiValue !== undefined && (
                    <p className="text-2xl font-bold text-green-700">
                      {dtiValue.toFixed(1)}%
                    </p>
                  )}
                  {lastUpdated && (
                    <p className="text-xs text-green-600">
                      Last updated: {formatDate(lastUpdated)}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  {dtiValue !== undefined && (
                    <p className="text-sm text-green-700 font-medium">
                      {dtiValue <= 43 ? 'Good for FHA' : 'May need improvement'}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            <Button 
              onClick={onCalculate}
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Recalculate DTI
            </Button>
          </>
        )}

        {status === 'needs-update' && (
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-900">
                    Your DTI information may be outdated
                  </p>
                  <p className="text-sm text-amber-700">
                    Your financial situation may have changed. Update your DTI calculation 
                    for the most accurate mortgage qualification estimate.
                  </p>
                  {lastUpdated && (
                    <p className="text-xs text-amber-600 mt-2">
                      Last calculated: {formatDate(lastUpdated)}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            <Button 
              onClick={onCalculate}
              className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Update DTI Calculation
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}