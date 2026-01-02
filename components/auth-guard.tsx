'use client';

import { useRouter } from 'next/navigation';
import { PinModal } from './pin-modal';

interface AuthGuardProps {
  householdExists: boolean;
  isAuthenticated: boolean;
  children: React.ReactNode;
}

export function AuthGuard({ householdExists, isAuthenticated, children }: AuthGuardProps) {
  const router = useRouter();

  // Determine mode based on household existence
  const mode = householdExists ? 'verify' : 'setup';

  const handlePinSuccess = () => {
    // Refresh the page to update server-side session state
    router.refresh();
  };

  // Don't render children until authenticated
  if (!isAuthenticated) {
    return (
      <PinModal
        open
        mode={mode}
        onSuccess={handlePinSuccess}
      />
    );
  }

  return (
    <>
      {children}
    </>
  );
}
