import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronUp, 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  Calculator,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

// DTI Results interface based on the calculation logic
interface DTIResults {
  frontEndRatio: number;
  backEndRatio: number;
  maximumLoanAmount: number;
  monthlyIncome: number;
  totalMonthlyDebts: number;
  proposedHousingExpense: number;
  compensatingFactors: string[];
  flags: DTIFlag[];
  status: 'approved' | 'borderline' | 'declined';
  details?: {
    incomeBreakdown?: {
      baseIncome?: number;
      overtimeIncome?: number;
      bonusIncome?: number;
      otherIncome?: number;
    };
    debtBreakdown?: {
      creditCards?: number;
      autoLoans?: number;
      studentLoans?: number;
      otherDebts?: number;
    };
  };
}

interface DTIFlag {
  type: 'warning' | 'error' | 'info';
  message: string;
}

interface DTISummaryCardProps {
  dtiResults: DTIResults;
  onRecalculate: () => void;
}

export function DTISummaryCard({ dtiResults, onRecalculate }: DTISummaryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Helper function to get ratio status and styling
  const getRatioStatus = (ratio: number, isBackEnd: boolean = false) => {
    const limit = isBackEnd ? 43 : 31;
    const warningThreshold = isBackEnd ? 40 : 28;

    if (ratio <= warningThreshold) {
      return {
        status: 'good',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        icon: CheckCircle2,
        badgeVariant: 'default' as const,
      };
    } else if (ratio <= limit) {
      return {
        status: 'borderline',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        icon: AlertCircle,
        badgeVariant: 'secondary' as const,
      };
    } else {
      return {
        status: 'high',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        icon: XCircle,
        badgeVariant: 'destructive' as const,
      };
    }
  };

  // Get overall status styling
  const getOverallStatus = () => {
    switch (dtiResults.status) {
      case 'approved':
        return {
          label: 'Approved',
          variant: 'default' as const,
          icon: CheckCircle2,
          color: 'text-green-600',
        };
      case 'borderline':
        return {
          label: 'Conditional',
          variant: 'secondary' as const,
          icon: AlertCircle,
          color: 'text-yellow-600',
        };
      case 'declined':
        return {
          label: 'Review Required',
          variant: 'destructive' as const,
          icon: XCircle,
          color: 'text-red-600',
        };
    }
  };

  const frontEndStatus = getRatioStatus(dtiResults.frontEndRatio);
  const backEndStatus = getRatioStatus(dtiResults.backEndRatio, true);
  const overallStatus = getOverallStatus();

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold">DTI Summary</CardTitle>
            <CardDescription>Debt-to-Income Ratio Analysis</CardDescription>
          </div>
          <Badge variant={overallStatus.variant} className="h-8 px-3 text-sm">
            <overallStatus.icon className="mr-1 h-4 w-4" />
            {overallStatus.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Front-End Ratio */}
          <div className={cn(
            "rounded-lg border p-4",
            frontEndStatus.bgColor,
            frontEndStatus.borderColor
          )}>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Front-End Ratio</p>
                <p className={cn("text-2xl font-bold", frontEndStatus.color)}>
                  {dtiResults.frontEndRatio.toFixed(1)}%
                </p>
              </div>
              <frontEndStatus.icon className={cn("h-8 w-8", frontEndStatus.color)} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Housing expenses / Monthly income
            </p>
          </div>

          {/* Back-End Ratio */}
          <div className={cn(
            "rounded-lg border p-4",
            backEndStatus.bgColor,
            backEndStatus.borderColor
          )}>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Back-End Ratio</p>
                <p className={cn("text-2xl font-bold", backEndStatus.color)}>
                  {dtiResults.backEndRatio.toFixed(1)}%
                </p>
              </div>
              <backEndStatus.icon className={cn("h-8 w-8", backEndStatus.color)} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Total debts / Monthly income
            </p>
          </div>

          {/* Maximum Loan Amount */}
          <div className="rounded-lg border bg-blue-50 border-blue-200 p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Max Loan Amount</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${dtiResults.maximumLoanAmount.toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Based on borrowing power
            </p>
          </div>
        </div>

        {/* Flags and Warnings */}
        {dtiResults.flags.length > 0 && (
          <div className="space-y-2">
            {dtiResults.flags.map((flag, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-2 rounded-lg border p-3",
                  flag.type === 'error' && "bg-red-50 border-red-200",
                  flag.type === 'warning' && "bg-yellow-50 border-yellow-200",
                  flag.type === 'info' && "bg-blue-50 border-blue-200"
                )}
              >
                <Info className={cn(
                  "h-4 w-4 mt-0.5",
                  flag.type === 'error' && "text-red-600",
                  flag.type === 'warning' && "text-yellow-600",
                  flag.type === 'info' && "text-blue-600"
                )} />
                <p className={cn(
                  "text-sm",
                  flag.type === 'error' && "text-red-800",
                  flag.type === 'warning' && "text-yellow-800",
                  flag.type === 'info' && "text-blue-800"
                )}>
                  {flag.message}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Expandable Details */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span>View Detailed Breakdown</span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-4">
            {/* Income Breakdown */}
            <div className="rounded-lg border bg-muted/50 p-4">
              <h4 className="mb-3 font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Monthly Income Breakdown
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Monthly Income</span>
                  <span className="font-medium">${dtiResults.monthlyIncome.toLocaleString()}</span>
                </div>
                {dtiResults.details?.incomeBreakdown && (
                  <>
                    {dtiResults.details.incomeBreakdown.baseIncome && (
                      <div className="flex justify-between pl-4">
                        <span className="text-sm text-muted-foreground">Base Income</span>
                        <span className="text-sm">${dtiResults.details.incomeBreakdown.baseIncome.toLocaleString()}</span>
                      </div>
                    )}
                    {dtiResults.details.incomeBreakdown.overtimeIncome && (
                      <div className="flex justify-between pl-4">
                        <span className="text-sm text-muted-foreground">Overtime Income</span>
                        <span className="text-sm">${dtiResults.details.incomeBreakdown.overtimeIncome.toLocaleString()}</span>
                      </div>
                    )}
                    {dtiResults.details.incomeBreakdown.bonusIncome && (
                      <div className="flex justify-between pl-4">
                        <span className="text-sm text-muted-foreground">Bonus Income</span>
                        <span className="text-sm">${dtiResults.details.incomeBreakdown.bonusIncome.toLocaleString()}</span>
                      </div>
                    )}
                    {dtiResults.details.incomeBreakdown.otherIncome && (
                      <div className="flex justify-between pl-4">
                        <span className="text-sm text-muted-foreground">Other Income</span>
                        <span className="text-sm">${dtiResults.details.incomeBreakdown.otherIncome.toLocaleString()}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Debt Breakdown */}
            <div className="rounded-lg border bg-muted/50 p-4">
              <h4 className="mb-3 font-semibold flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                Monthly Debt Breakdown
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Proposed Housing Expense</span>
                  <span className="font-medium">${dtiResults.proposedHousingExpense.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Monthly Debts</span>
                  <span className="font-medium">${dtiResults.totalMonthlyDebts.toLocaleString()}</span>
                </div>
                {dtiResults.details?.debtBreakdown && (
                  <>
                    {dtiResults.details.debtBreakdown.creditCards && (
                      <div className="flex justify-between pl-4">
                        <span className="text-sm text-muted-foreground">Credit Cards</span>
                        <span className="text-sm">${dtiResults.details.debtBreakdown.creditCards.toLocaleString()}</span>
                      </div>
                    )}
                    {dtiResults.details.debtBreakdown.autoLoans && (
                      <div className="flex justify-between pl-4">
                        <span className="text-sm text-muted-foreground">Auto Loans</span>
                        <span className="text-sm">${dtiResults.details.debtBreakdown.autoLoans.toLocaleString()}</span>
                      </div>
                    )}
                    {dtiResults.details.debtBreakdown.studentLoans && (
                      <div className="flex justify-between pl-4">
                        <span className="text-sm text-muted-foreground">Student Loans</span>
                        <span className="text-sm">${dtiResults.details.debtBreakdown.studentLoans.toLocaleString()}</span>
                      </div>
                    )}
                    {dtiResults.details.debtBreakdown.otherDebts && (
                      <div className="flex justify-between pl-4">
                        <span className="text-sm text-muted-foreground">Other Debts</span>
                        <span className="text-sm">${dtiResults.details.debtBreakdown.otherDebts.toLocaleString()}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Compensating Factors */}
            {dtiResults.compensatingFactors.length > 0 && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <h4 className="mb-3 font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Compensating Factors Applied
                </h4>
                <ul className="space-y-1">
                  {dtiResults.compensatingFactors.map((factor, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">•</span>
                      <span className="text-sm">{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Calculation Summary */}
            <div className="rounded-lg border bg-gray-50 p-4">
              <h4 className="mb-3 font-semibold">Calculation Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Front-End Calculation</span>
                  <span className="font-mono">
                    ${dtiResults.proposedHousingExpense.toLocaleString()} ÷ ${dtiResults.monthlyIncome.toLocaleString()} = {dtiResults.frontEndRatio.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Back-End Calculation</span>
                  <span className="font-mono">
                    ${(dtiResults.proposedHousingExpense + dtiResults.totalMonthlyDebts).toLocaleString()} ÷ ${dtiResults.monthlyIncome.toLocaleString()} = {dtiResults.backEndRatio.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Recalculate Button */}
        <Button 
          onClick={onRecalculate} 
          className="w-full"
          size="lg"
        >
          <Calculator className="mr-2 h-4 w-4" />
          Recalculate DTI
        </Button>
      </CardContent>
    </Card>
  );
}