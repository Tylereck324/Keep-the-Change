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
  const router = useRouter();

  // Determine mode based on household existence
  const mode = householdExists ? 'verify' : 'setup';

  useEffect(() => {
    // Show modal if not authenticated
    if (!isAuthenticated) {
      setShowPinModal(true);
    }
  }, [isAuthenticated]);

  const handlePinSuccess = () => {
    setShowPinModal(false);
    // Refresh the page to update server-side session state
    router.refresh();
  };

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
