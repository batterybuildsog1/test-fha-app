/**
 * DTI Wizard - Compound Component Pattern
 * 
 * Main wizard component that manages step state and provides compound component API.
 * Uses compound pattern where child components are tightly coupled with parent state.
 */

import React, { createContext, useContext, useCallback, useMemo, useState, ReactNode, useEffect } from 'react';
import { useDTIContext } from '../../context/DTIContext';
import { useDTICalculation } from '../../hooks/useDTICalculation';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { CheckCircle, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';

// Step configuration
export interface DTIWizardStep {
  id: string;
  title: string;
  description: string;
  required: boolean;
  validation?: () => boolean;
  onEnter?: () => void;
  onExit?: () => void;
}

// Wizard context type
interface DTIWizardContextType {
  currentStep: number;
  steps: DTIWizardStep[];
  canGoNext: boolean;
  canGoPrev: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
  completedSteps: Set<number>;
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  registerStep: (step: DTIWizardStep) => void;
  updateStepValidation: (stepId: string, isValid: boolean) => void;
  getStepStatus: (stepIndex: number) => 'pending' | 'current' | 'completed' | 'invalid';
}

// Create wizard context
const DTIWizardContext = createContext<DTIWizardContextType | null>(null);

// Hook to use wizard context
export const useDTIWizard = () => {
  const context = useContext(DTIWizardContext);
  if (!context) {
    throw new Error('useDTIWizard must be used within a DTIWizard');
  }
  return context;
};

// Default steps configuration
const DEFAULT_STEPS: DTIWizardStep[] = [
  {
    id: 'income',
    title: 'Income Information',
    description: 'Enter your annual income details',
    required: true,
  },
  {
    id: 'debts',
    title: 'Debt Information',
    description: 'Enter your monthly debt obligations',
    required: true,
  },
  {
    id: 'credit',
    title: 'Credit & Loan Details',
    description: 'Credit score and loan preferences',
    required: true,
  },
  {
    id: 'compensating-factors',
    title: 'Compensating Factors',
    description: 'Factors that may improve your DTI limits',
    required: false,
  },
  {
    id: 'results',
    title: 'DTI Results',
    description: 'Your debt-to-income calculation results',
    required: false,
  },
];

// Main wizard component props
interface DTIWizardProps {
  children: ReactNode;
  onComplete?: (results: any) => void;
  onStepChange?: (currentStep: number, stepId: string) => void;
  initialStep?: number;
  steps?: DTIWizardStep[];
  className?: string;
}

// Step validation tracker
interface StepValidation {
  [stepId: string]: boolean;
}

// Main DTI Wizard component
export const DTIWizard: React.FC<DTIWizardProps> = ({
  children,
  onComplete,
  onStepChange,
  initialStep = 0,
  steps = DEFAULT_STEPS,
  className = '',
}) => {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [stepValidations, setStepValidations] = useState<StepValidation>({});
  const [registeredSteps, setRegisteredSteps] = useState<DTIWizardStep[]>(steps);

  const dtiContext = useDTIContext();
  const { hasRequiredInputs, validateInputs } = dtiContext;

  // Register step (for dynamic step registration)
  const registerStep = useCallback((step: DTIWizardStep) => {
    setRegisteredSteps(prev => {
      const exists = prev.find(s => s.id === step.id);
      if (exists) return prev;
      return [...prev, step];
    });
  }, []);

  // Update step validation
  const updateStepValidation = useCallback((stepId: string, isValid: boolean) => {
    setStepValidations(prev => ({
      ...prev,
      [stepId]: isValid,
    }));
  }, []);

  // Get step status
  const getStepStatus = useCallback((stepIndex: number): 'pending' | 'current' | 'completed' | 'invalid' => {
    if (stepIndex === currentStep) return 'current';
    if (completedSteps.has(stepIndex)) return 'completed';
    
    const step = registeredSteps[stepIndex];
    if (step && stepValidations[step.id] === false) return 'invalid';
    
    return 'pending';
  }, [currentStep, completedSteps, registeredSteps, stepValidations]);

  // Validate current step
  const validateCurrentStep = useCallback((): boolean => {
    const step = registeredSteps[currentStep];
    if (!step) return false;

    // Use custom validation if provided
    if (step.validation) {
      return step.validation();
    }

    // Use step-specific validation
    const isValid = stepValidations[step.id] !== false;
    
    // For required steps, also check DTI context validation
    if (step.required && step.id !== 'results') {
      return isValid && validateInputs();
    }

    return isValid;
  }, [currentStep, registeredSteps, stepValidations, validateInputs]);

  // Navigation helpers
  const canGoNext = useMemo(() => {
    return currentStep < registeredSteps.length - 1 && validateCurrentStep();
  }, [currentStep, registeredSteps.length, validateCurrentStep]);

  const canGoPrev = useMemo(() => {
    return currentStep > 0;
  }, [currentStep]);

  const isFirstStep = useMemo(() => currentStep === 0, [currentStep]);
  const isLastStep = useMemo(() => currentStep === registeredSteps.length - 1, [currentStep, registeredSteps.length]);

  // Navigation functions
  const goToStep = useCallback((step: number) => {
    if (step < 0 || step >= registeredSteps.length) return;
    
    const currentStepConfig = registeredSteps[currentStep];
    
    // Call onExit for current step
    if (currentStepConfig?.onExit) {
      currentStepConfig.onExit();
    }
    
    // Mark current step as completed if valid
    if (validateCurrentStep()) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
    }
    
    setCurrentStep(step);
    
    const newStepConfig = registeredSteps[step];
    
    // Call onEnter for new step
    if (newStepConfig?.onEnter) {
      newStepConfig.onEnter();
    }
    
    // Call onStepChange callback
    if (onStepChange) {
      onStepChange(step, newStepConfig?.id || '');
    }
  }, [currentStep, registeredSteps, validateCurrentStep, onStepChange]);

  const nextStep = useCallback(() => {
    if (canGoNext) {
      goToStep(currentStep + 1);
    }
  }, [canGoNext, currentStep, goToStep]);

  const prevStep = useCallback(() => {
    if (canGoPrev) {
      goToStep(currentStep - 1);
    }
  }, [canGoPrev, currentStep, goToStep]);

  // Handle completion
  useEffect(() => {
    if (isLastStep && validateCurrentStep() && onComplete) {
      // Collect all results for completion callback
      const results = {
        dtiResponse: dtiContext.state.dtiResponse,
        borrowingPowerResponse: dtiContext.state.borrowingPowerResponse,
        completedSteps: Array.from(completedSteps),
        inputs: {
          annualIncome: dtiContext.state.annualIncome,
          monthlyDebts: dtiContext.state.monthlyDebts,
          debtItems: dtiContext.state.debtItems,
          compensatingFactors: dtiContext.state.compensatingFactors,
          creditScore: dtiContext.state.creditScore,
          loanType: dtiContext.state.loanType,
          ltv: dtiContext.state.ltv,
        },
      };
      
      onComplete(results);
    }
  }, [isLastStep, validateCurrentStep, onComplete, dtiContext.state, completedSteps]);

  // Context value
  const contextValue: DTIWizardContextType = useMemo(() => ({
    currentStep,
    steps: registeredSteps,
    canGoNext,
    canGoPrev,
    isFirstStep,
    isLastStep,
    completedSteps,
    goToStep,
    nextStep,
    prevStep,
    registerStep,
    updateStepValidation,
    getStepStatus,
  }), [
    currentStep,
    registeredSteps,
    canGoNext,
    canGoPrev,
    isFirstStep,
    isLastStep,
    completedSteps,
    goToStep,
    nextStep,
    prevStep,
    registerStep,
    updateStepValidation,
    getStepStatus,
  ]);

  return (
    <DTIWizardContext.Provider value={contextValue}>
      <div className={`dti-wizard ${className}`}>
        {children}
      </div>
    </DTIWizardContext.Provider>
  );
};

// Progress indicator component
interface DTIWizardProgressProps {
  className?: string;
  showStepNames?: boolean;
}

const DTIWizardProgress: React.FC<DTIWizardProgressProps> = ({ 
  className = '', 
  showStepNames = true 
}) => {
  const { currentStep, steps, getStepStatus } = useDTIWizard();
  
  const progress = ((currentStep + 1) / steps.length) * 100;
  
  return (
    <div className={`dti-wizard-progress ${className}`}>
      <div className="mb-4">
        <Progress value={progress} className="w-full" />
        <div className="flex justify-between text-sm text-muted-foreground mt-2">
          <span>Step {currentStep + 1} of {steps.length}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
      </div>
      
      {showStepNames && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-6">
          {steps.map((step, index) => {
            const status = getStepStatus(index);
            const isCurrent = index === currentStep;
            
            return (
              <div
                key={step.id}
                className={`
                  p-3 rounded-lg border text-center transition-all
                  ${isCurrent ? 'border-primary bg-primary/10' : ''}
                  ${status === 'completed' ? 'border-green-500 bg-green-50' : ''}
                  ${status === 'invalid' ? 'border-red-500 bg-red-50' : ''}
                  ${status === 'pending' ? 'border-gray-200 bg-gray-50' : ''}
                `}
              >
                <div className="flex items-center justify-center mb-1">
                  {status === 'completed' && <CheckCircle className="w-4 h-4 text-green-500" />}
                  {status === 'invalid' && <AlertCircle className="w-4 h-4 text-red-500" />}
                  {status === 'current' && <div className="w-4 h-4 bg-primary rounded-full" />}
                  {status === 'pending' && <div className="w-4 h-4 bg-gray-300 rounded-full" />}
                </div>
                <div className="text-xs font-medium">{step.title}</div>
                <div className="text-xs text-muted-foreground">{step.description}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Step wrapper component
interface DTIWizardStepProps {
  stepId: string;
  children: ReactNode;
  validation?: () => boolean;
  onEnter?: () => void;
  onExit?: () => void;
  className?: string;
}

const DTIWizardStep: React.FC<DTIWizardStepProps> = ({
  stepId,
  children,
  validation,
  onEnter,
  onExit,
  className = '',
}) => {
  const { currentStep, steps, updateStepValidation } = useDTIWizard();
  
  // Find step index
  const stepIndex = steps.findIndex(step => step.id === stepId);
  const isCurrentStep = stepIndex === currentStep;
  
  // Update validation when it changes
  useEffect(() => {
    if (validation) {
      updateStepValidation(stepId, validation());
    }
  }, [validation, stepId, updateStepValidation]);
  
  // Handle step enter/exit
  useEffect(() => {
    if (isCurrentStep && onEnter) {
      onEnter();
    }
    
    return () => {
      if (isCurrentStep && onExit) {
        onExit();
      }
    };
  }, [isCurrentStep, onEnter, onExit]);
  
  if (!isCurrentStep) return null;
  
  return (
    <div className={`dti-wizard-step ${className}`}>
      {children}
    </div>
  );
};

// Navigation component
interface DTIWizardNavigationProps {
  className?: string;
  showStepInfo?: boolean;
  prevLabel?: string;
  nextLabel?: string;
  finishLabel?: string;
}

const DTIWizardNavigation: React.FC<DTIWizardNavigationProps> = ({
  className = '',
  showStepInfo = true,
  prevLabel = 'Previous',
  nextLabel = 'Next',
  finishLabel = 'Finish',
}) => {
  const { 
    currentStep, 
    steps, 
    canGoNext, 
    canGoPrev, 
    isLastStep, 
    nextStep, 
    prevStep 
  } = useDTIWizard();
  
  const currentStepConfig = steps[currentStep];
  
  return (
    <div className={`dti-wizard-navigation ${className}`}>
      {showStepInfo && currentStepConfig && (
        <div className="mb-4 text-center">
          <h2 className="text-xl font-semibold mb-2">{currentStepConfig.title}</h2>
          <p className="text-muted-foreground">{currentStepConfig.description}</p>
        </div>
      )}
      
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={!canGoPrev}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {prevLabel}
        </Button>
        
        <Button
          onClick={nextStep}
          disabled={!canGoNext}
          className="flex items-center gap-2"
        >
          {isLastStep ? finishLabel : nextLabel}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

// Content wrapper component
interface DTIWizardContentProps {
  children: ReactNode;
  className?: string;
}

const DTIWizardContent: React.FC<DTIWizardContentProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <Card className={`dti-wizard-content ${className}`}>
      <CardContent className="p-6">
        {children}
      </CardContent>
    </Card>
  );
};

// Export compound components
DTIWizard.Step = DTIWizardStep;
DTIWizard.Progress = DTIWizardProgress;
DTIWizard.Navigation = DTIWizardNavigation;
DTIWizard.Content = DTIWizardContent;

export { DTIWizardStep, DTIWizardProgress, DTIWizardNavigation, DTIWizardContent };