import { useEffect, useState, type ReactNode } from 'react';
import { useSession } from '../hooks/useSession';
import { isStaff, signOut } from '../lib/api';
import LoginPage from '../pages/LoginPage';

const notice = 'text-center text-gray-700 mt-16';

/**
 * Renders `children` only for signed-in users on the staff allowlist.
 * Signed-out visitors get the sign-in form; other accounts get a notice
 * (the database would reject their actions anyway).
 */
export function StaffOnly({ children }: { children: ReactNode }) {
  const session = useSession();
  const userId = session?.user.id;
  // Which user the last allowlist check was for, so a stale result from a
  // previous account is never shown while the new check runs.
  const [check, setCheck] = useState<{ userId: string; allowed: boolean } | null>(null);

  useEffect(() => {
    if (!userId) return;
    let current = true;
    isStaff()
      .then((allowed) => current && setCheck({ userId, allowed }))
      .catch(() => current && setCheck({ userId, allowed: false }));
    return () => { current = false; };
  }, [userId]);

  if (session === undefined) return <p className={notice}>جارٍ التحميل...</p>;
  if (!session) return <LoginPage />;
  if (!check || check.userId !== userId) return <p className={notice}>جارٍ التحقق من الصلاحيات...</p>;
  if (!check.allowed) {
    return (
      <div className={`${notice} space-y-4`}>
        <p className="font-bold">هذا الحساب غير مصرح له بإدارة المزاد.</p>
        <button type="button" onClick={signOut} className="px-5 py-2 rounded-full bg-gray-900 text-amber-400 font-bold">
          تسجيل الخروج
        </button>
      </div>
    );
  }
  return children;
}
