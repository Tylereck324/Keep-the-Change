import { AuthGuard } from '@/components/auth-guard';
import { Dashboard } from '@/components/dashboard';
import { getSession, checkHouseholdExists } from '@/lib/auth';

export default async function Home() {
  // Check server-side authentication state
  const session = await getSession();
  const householdExists = await checkHouseholdExists();

  const isAuthenticated = !!session;

  return (
    <AuthGuard
      householdExists={householdExists}
      isAuthenticated={isAuthenticated}
    >
      <Dashboard />
    </AuthGuard>
  );
}
