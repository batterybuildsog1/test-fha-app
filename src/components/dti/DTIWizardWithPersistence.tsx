/**
 * DTI Wizard with Persistence
 * 
 * Enhanced DTI Wizard component with session persistence,
 * auto-save, and resume functionality.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { DTIWizard } from './DTIWizard';
import { useAutoSave, useResumeSession, useSaveResults, useClearSession } from '../../hooks/useDTIPersistence';
import { getSessionIdFromUrl, updateUrlWithSessionId, removeSessionIdFromUrl, generateShareableUrl } from '../../lib/session-utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Save, RefreshCw, Share2, Download, Upload, Trash2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface DTIWizardWithPersistenceProps {
  children: React.ReactNode;
  onComplete?: (results: any) => void;
  className?: string;
}

export const DTIWizardWithPersistence: React.FC<DTIWizardWithPersistenceProps> = ({
  children,
  onComplete,
  className,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [resumeData, setResumeData] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const { sessionState, hasResumeOption, initializeSession, loadSessionData } = useResumeSession();
  const { isSaving, lastSaved, error: saveError } = useAutoSave(sessionId, currentStep, completedSteps);
  const { saveResults } = useSaveResults(sessionId);
  const clearSession = useClearSession();

  // Initialize session on mount
  useEffect(() => {
    const urlSessionId = getSessionIdFromUrl();
    
    const init = async () => {
      if (urlSessionId) {
        // Try to load specific session from URL
        const sessionData = await initializeSession(false);
        if (sessionData && sessionData.sessionId === urlSessionId) {
          setResumeData(sessionData);
          setShowResumeDialog(true);
        } else {
          // Session not found or different, create new
          removeSessionIdFromUrl();
          const newSession = await initializeSession(true);
          if (newSession) {
            setSessionId(newSession.sessionId);
            updateUrlWithSessionId(newSession.sessionId);
          }
        }
      } else {
        // Check for existing session
        const sessionData = await initializeSession(false);
        if (sessionData && hasResumeOption) {
          setResumeData(sessionData);
          setShowResumeDialog(true);
        } else {
          setSessionId(sessionState.sessionId);
          if (sessionState.sessionId) {
            updateUrlWithSessionId(sessionState.sessionId);
          }
        }
      }
    };

    init();
  }, []);

  // Handle resume decision
  const handleResume = useCallback((shouldResume: boolean) => {
    if (shouldResume && resumeData) {
      const stepData = loadSessionData(resumeData);
      if (stepData) {
        setCurrentStep(stepData.currentStep);
        setCompletedSteps(stepData.completedSteps);
      }
      setSessionId(resumeData.sessionId);
      updateUrlWithSessionId(resumeData.sessionId);
    } else {
      // Create new session
      initializeSession(true).then((newSession) => {
        if (newSession) {
          setSessionId(newSession.sessionId);
          updateUrlWithSessionId(newSession.sessionId);
        }
      });
    }
    setShowResumeDialog(false);
  }, [resumeData, loadSessionData, initializeSession]);

  // Handle step change
  const handleStepChange = useCallback((step: number, stepId: string) => {
    setCurrentStep(step);
    
    // Update completed steps
    if (step > 0 && !completedSteps.includes(step - 1)) {
      setCompletedSteps(prev => [...prev, step - 1]);
    }
  }, [completedSteps]);

  // Handle completion
  const handleComplete = useCallback(async (results: any) => {
    if (sessionId && results.dtiResponse && results.borrowingPowerResponse) {
      const saved = await saveResults({
        frontEndRatio: results.dtiResponse.actual.frontEnd,
        backEndRatio: results.dtiResponse.actual.backEnd,
        maxLoanAmount: results.borrowingPowerResponse.loanAmount,
        isQualified: results.dtiResponse.actual.backEnd <= results.dtiResponse.allowed.backEnd,
      });

      if (saved) {
        toast.success('Results saved successfully!');
      }
    }

    if (onComplete) {
      onComplete(results);
    }
  }, [sessionId, saveResults, onComplete]);

  // Handle share
  const handleShare = useCallback(() => {
    if (!sessionId) return;

    const shareUrl = generateShareableUrl(sessionId);
    
    if (navigator.share) {
      navigator.share({
        title: 'DTI Calculator Session',
        text: 'Continue your DTI calculation',
        url: shareUrl,
      }).catch(() => {
        // Fallback to clipboard
        navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied to clipboard!');
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard!');
    }
  }, [sessionId]);

  // Handle clear session
  const handleClearSession = useCallback(async () => {
    if (!sessionId) return;

    const cleared = await clearSession(sessionId);
    if (cleared) {
      removeSessionIdFromUrl();
      toast.success('Session cleared. Starting fresh...');
      window.location.reload();
    }
  }, [sessionId, clearSession]);

  return (
    <>
      {/* Resume Session Dialog */}
      <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resume Previous Session?</DialogTitle>
            <DialogDescription>
              We found an incomplete DTI calculation from your last visit. 
              Would you like to continue where you left off?
            </DialogDescription>
          </DialogHeader>
          
          {resumeData && (
            <Card className="my-4">
              <CardContent className="pt-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Progress:</span>
                    <span>Step {resumeData.currentStep + 1} of 5</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last updated:</span>
                    <span>{new Date(resumeData.updatedAt).toLocaleDateString()}</span>
                  </div>
                  {resumeData.data?.income?.annualIncome && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Income:</span>
                      <span>${resumeData.data.income.annualIncome.toLocaleString()}/year</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => handleResume(false)}>
              Start Fresh
            </Button>
            <Button onClick={() => handleResume(true)}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Resume Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Wizard with Persistence UI */}
      <div className={`relative ${className}`}>
        {/* Save Status Bar */}
        <div className="flex items-center justify-between mb-4 p-2 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            {isSaving && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Saving...
              </Badge>
            )}
            {!isSaving && lastSaved && (
              <Badge variant="outline" className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Saved {new Date(lastSaved).toLocaleTimeString()}
              </Badge>
            )}
            {saveError && (
              <Badge variant="destructive">
                Save failed
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              disabled={!sessionId}
              title="Share session"
            >
              <Share2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSession}
              disabled={!sessionId}
              title="Clear session"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Session ID Display (for debugging/support) */}
        {sessionId && (
          <div className="text-xs text-muted-foreground mb-2">
            Session: {sessionId.substring(0, 8)}...
          </div>
        )}

        {/* DTI Wizard */}
        <DTIWizard
          onComplete={handleComplete}
          onStepChange={handleStepChange}
          initialStep={currentStep}
        >
          {children}
        </DTIWizard>
      </div>
    </>
  );
};

// Export/Import Session Components
export const SessionExportImport: React.FC<{ sessionId: string | null }> = ({ sessionId }) => {
  const { exportSession, isExporting } = useExportSession();
  const { handleImport, isImporting } = useImportSession();

  const handleExport = useCallback(async () => {
    if (!sessionId) return;
    
    const exported = await exportSession(sessionId);
    if (exported) {
      toast.success('Session exported successfully!');
    } else {
      toast.error('Failed to export session');
    }
  }, [sessionId, exportSession]);

  const handleFileImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const newSessionId = await handleImport(file);
    if (newSessionId) {
      toast.success('Session imported successfully!');
      updateUrlWithSessionId(newSessionId);
      setTimeout(() => window.location.reload(), 1000);
    } else {
      toast.error('Failed to import session');
    }
  }, [handleImport]);

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={!sessionId || isExporting}
      >
        <Download className="w-4 h-4 mr-2" />
        Export
      </Button>
      
      <label>
        <input
          type="file"
          accept=".json"
          onChange={handleFileImport}
          disabled={isImporting}
          className="hidden"
        />
        <Button
          variant="outline"
          size="sm"
          disabled={isImporting}
          asChild
        >
          <span>
            <Upload className="w-4 h-4 mr-2" />
            Import
          </span>
        </Button>
      </label>
    </div>
  );
};

// Missing imports
import { useExportSession, useImportSession } from '../../hooks/useDTIPersistence';