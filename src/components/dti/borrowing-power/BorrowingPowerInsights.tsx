/**
 * Borrowing Power Insights Component
 * 
 * Provides actionable insights using actual domain types and interfaces.
 */

import React from 'react';
import { Lightbulb, TrendingUp, Shield, AlertTriangle, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Alert, AlertDescription } from '../../ui/alert';
import { CompensatingFactors, DTIResponse } from '../../../convex/domain/types';

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

interface BorrowingPowerInsightsProps {
  analysis: BorrowingPowerAnalysis | null;
  dtiResponse: DTIResponse | null;
  scenarios: {
    conservative: BorrowingPowerAnalysis | null;
    moderate: BorrowingPowerAnalysis | null;
    aggressive: BorrowingPowerAnalysis | null;
  };
  recommendations: string[];
  compensatingFactors: CompensatingFactors;
  loanType: 'fha' | 'conventional';
}

export const BorrowingPowerInsights: React.FC<BorrowingPowerInsightsProps> = ({
  analysis,
  dtiResponse,
  scenarios,
  recommendations,
  compensatingFactors,
  loanType,
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Generate insights based on current situation
  const insights = React.useMemo(() => {
    if (!analysis || !dtiResponse) return [];

    const insights: Array<{
      type: 'opportunity' | 'warning' | 'optimization' | 'info';
      title: string;
      description: string;
      action?: string;
      priority: 'high' | 'medium' | 'low';
    }> = [];

    // DTI Analysis
    const dtiUtilization = (dtiResponse.actual.backEnd / dtiResponse.allowed.backEnd) * 100;
    const dtiHeadroom = dtiResponse.allowed.backEnd - dtiResponse.actual.backEnd;
    
    if (dtiHeadroom > 5) {
      insights.push({
        type: 'opportunity',
        title: 'Excellent DTI Position',
        description: `You have ${dtiHeadroom.toFixed(1)}% DTI headroom, providing flexibility for higher loan amounts.`,
        action: 'Consider exploring higher purchase prices or improving other factors',
        priority: 'medium',
      });
    } else if (dtiHeadroom < 2) {
      insights.push({
        type: 'warning',
        title: 'Limited DTI Headroom',
        description: `Only ${dtiHeadroom.toFixed(1)}% DTI headroom remaining. Consider debt reduction strategies.`,
        action: 'Focus on paying down existing debts before applying',
        priority: 'high',
      });
    }

    // Strong Factor Analysis
    const strongFactorCount = dtiResponse.strongFactorCount || 0;
    if (strongFactorCount < 2) {
      insights.push({
        type: 'optimization',
        title: 'Strengthen Your Profile',
        description: `You have ${strongFactorCount} strong compensating factors. Adding more could increase your DTI limits.`,
        action: 'Review and improve compensating factors',
        priority: 'medium',
      });
    } else if (strongFactorCount >= 3) {
      insights.push({
        type: 'opportunity',
        title: 'Strong Compensating Factors',
        description: `Your ${strongFactorCount} strong factors provide excellent DTI flexibility.`,
        priority: 'low',
      });
    }

    // Affordability Rating Insights
    switch (analysis.affordabilityRating) {
      case 'excellent':
        insights.push({
          type: 'opportunity',
          title: 'Excellent Affordability',
          description: 'Your income and debt profile provides excellent borrowing capacity.',
          priority: 'low',
        });
        break;
      case 'good':
        insights.push({
          type: 'info',
          title: 'Good Affordability',
          description: 'Your profile shows good borrowing capacity with room for optimization.',
          priority: 'low',
        });
        break;
      case 'fair':
        insights.push({
          type: 'warning',
          title: 'Fair Affordability',
          description: 'Your borrowing capacity is fair but could be improved.',
          action: 'Consider debt reduction or income improvement strategies',
          priority: 'medium',
        });
        break;
      case 'poor':
        insights.push({
          type: 'warning',
          title: 'Limited Affordability',
          description: 'Your current profile shows limited borrowing capacity.',
          action: 'Focus on debt reduction and strengthening compensating factors',
          priority: 'high',
        });
        break;
    }

    // Loan Type Optimization
    if (loanType === 'conventional') {
      insights.push({
        type: 'info',
        title: 'Conventional Loan Benefits',
        description: 'Conventional loans often provide more DTI flexibility with strong compensating factors.',
        action: 'Consider comparing with FHA options',
        priority: 'low',
      });
    } else {
      insights.push({
        type: 'info',
        title: 'FHA Loan Advantages',
        description: 'FHA loans offer structured DTI tiers that can benefit borrowers with strong profiles.',
        action: 'Explore conventional loan alternatives',
        priority: 'low',
      });
    }

    // Compensating Factor Specific Insights
    if (compensatingFactors.cashReserves === 'none') {
      insights.push({
        type: 'optimization',
        title: 'Build Cash Reserves',
        description: 'Having 2+ months of payments in reserves is a strong compensating factor.',
        action: 'Consider saving for additional reserves',
        priority: 'medium',
      });
    }

    if (compensatingFactors.downPayment === '<5%') {
      insights.push({
        type: 'optimization',
        title: 'Consider Higher Down Payment',
        description: 'A down payment of 10%+ is considered a strong compensating factor.',
        action: 'Evaluate increasing your down payment',
        priority: 'medium',
      });
    }

    return insights.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }, [analysis, dtiResponse, compensatingFactors, loanType]);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'optimization':
        return <Lightbulb className="w-4 h-4 text-blue-600" />;
      case 'info':
        return <Shield className="w-4 h-4 text-gray-600" />;
      default:
        return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getInsightBadgeColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!analysis || !dtiResponse) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="w-4 h-4" />
            Borrowing Power Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Complete your DTI calculation to see personalized insights and recommendations.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const dtiHeadroom = dtiResponse.allowed.backEnd - dtiResponse.actual.backEnd;
  const strongFactorCount = dtiResponse.strongFactorCount || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="w-4 h-4" />
          Borrowing Power Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-blue-600">
              {dtiHeadroom.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">DTI Headroom</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-green-600">
              {strongFactorCount}
            </div>
            <div className="text-xs text-muted-foreground">Strong Factors</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-purple-600">
              {loanType.toUpperCase()}
            </div>
            <div className="text-xs text-muted-foreground">Loan Type</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-orange-600">
              {analysis.affordabilityRating}
            </div>
            <div className="text-xs text-muted-foreground">Rating</div>
          </div>
        </div>

        {/* Insights List */}
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <Alert key={index} className="border-l-4 border-l-blue-500">
              <div className="flex items-start gap-3">
                {getInsightIcon(insight.type)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{insight.title}</span>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getInsightBadgeColor(insight.priority)}`}
                    >
                      {insight.priority}
                    </Badge>
                  </div>
                  <AlertDescription className="text-xs mb-2">
                    {insight.description}
                  </AlertDescription>
                  {insight.action && (
                    <div className="text-xs text-blue-600 font-medium">
                      💡 {insight.action}
                    </div>
                  )}
                </div>
              </div>
            </Alert>
          ))}
        </div>

        {/* Scenario Comparison */}
        <div className="p-3 bg-blue-50 rounded-lg">
          <h5 className="text-sm font-medium mb-2 flex items-center gap-1">
            <Target className="w-4 h-4" />
            Purchase Price Scenarios
          </h5>
          <div className="space-y-1">
            {scenarios.conservative && (
              <div className="flex justify-between text-xs">
                <span>Conservative (75%):</span>
                <span className="font-medium">
                  {formatCurrency(scenarios.conservative.maxPurchasePrice)}
                </span>
              </div>
            )}
            {scenarios.moderate && (
              <div className="flex justify-between text-xs">
                <span>Moderate (100%):</span>
                <span className="font-medium">
                  {formatCurrency(scenarios.moderate.maxPurchasePrice)}
                </span>
              </div>
            )}
            {scenarios.aggressive && (
              <div className="flex justify-between text-xs">
                <span>Aggressive (105%):</span>
                <span className="font-medium">
                  {formatCurrency(scenarios.aggressive.maxPurchasePrice)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="p-3 bg-green-50 rounded-lg">
            <h5 className="text-sm font-medium mb-2">📋 Key Recommendations</h5>
            <ul className="text-xs text-muted-foreground space-y-1">
              {recommendations.slice(0, 3).map((recommendation, index) => (
                <li key={index}>• {recommendation}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <Badge variant="outline" className="cursor-pointer hover:bg-gray-50">
            <TrendingUp className="w-3 h-3 mr-1" />
            Optimize DTI
          </Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-gray-50">
            <Shield className="w-3 h-3 mr-1" />
            Improve Factors
          </Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-gray-50">
            <Lightbulb className="w-3 h-3 mr-1" />
            Explore Options
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default BorrowingPowerInsights;