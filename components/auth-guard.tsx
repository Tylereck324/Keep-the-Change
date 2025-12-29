'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { PinModal } from './pin-modal';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [showPinModal, setShowPinModal] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setShowPinModal(true);
    } else {
      setShowPinModal(false);
    }
  }, [isAuthenticated, isLoading]);

  const handlePinSuccess = () => {
    setShowPinModal(false);
  };

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <>
      {children}
      <PinModal open={showPinModal} onSuccess={handlePinSuccess} />
    </>
  );
}
