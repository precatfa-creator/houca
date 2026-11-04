import type { ReactNode } from 'react';
import { useSession } from '../hooks/useSession';
import LoginPage from '../pages/LoginPage';

/** Renders `children` for signed-in staff, otherwise the sign-in form. */
export function StaffOnly({ children }: { children: ReactNode }) {
  const session = useSession();
  if (session === undefined) return <p className="text-center text-gray-600 mt-16">جارٍ التحميل...</p>;
  return session ? children : <LoginPage />;
}
