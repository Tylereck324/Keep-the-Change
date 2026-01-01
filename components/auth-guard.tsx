'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PinModal } from './pin-modal';

interface AuthGuardProps {
  householdExists: boolean;
  isAuthenticated: boolean;
  children: React.ReactNode;
}

export function AuthGuard({ householdExists, isAuthenticated, children }: AuthGuardProps) {
  const [showPinModal, setShowPinModal] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();

  // Determine mode based on household existence
  const mode = householdExists ? 'verify' : 'setup';

  useEffect(() => {
    // Show modal if not authenticated
    if (!isAuthenticated) {
      setShowPinModal(true);
    }
    // Mark as ready after initial check
    setIsReady(true);
  }, [isAuthenticated]);

  const handlePinSuccess = () => {
    setShowPinModal(false);
    // Refresh the page to update server-side session state
    router.refresh();
  };

  // Show loading state until ready (prevents flash of content)
  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Don't render children until authenticated
  if (!isAuthenticated) {
    return (
      <PinModal
        open={showPinModal}
        mode={mode}
        onSuccess={handlePinSuccess}
      />
    );
  }

  return (
    <>
      {children}
      <PinModal
        open={showPinModal}
        mode={mode}
        onSuccess={handlePinSuccess}
      />
    </>
  );
}
