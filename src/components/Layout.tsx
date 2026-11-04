import { LogOut } from 'lucide-react';
import { NavLink, Outlet, type NavLinkRenderProps } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { signOut } from '../lib/api';
import bgImage from '../assets/images/horse-background.jpg';

/** Tailwind classes for a header nav pill, highlighted when its route is active. */
function navLinkClass({ isActive }: NavLinkRenderProps): string {
  const base = 'px-5 py-2.5 rounded-full font-semibold text-sm transition-all';
  return isActive
    ? `${base} bg-gray-900 text-amber-400 shadow-md transform hover:-translate-y-0.5`
    : `${base} bg-white/60 text-gray-600 hover:bg-white/80 hover:text-gray-900 border border-transparent shadow-sm`;
}

/**
 * App shell: fixed horse background, sticky header with navigation between
 * the staff control panel (`/`) and the public auction board (`/list`),
 * and an outlet for the active page.
 */
export default function Layout() {
  const session = useSession();

  return (
    <div className="min-h-screen relative font-sans text-gray-900 bg-white">
      <div
        className="fixed inset-0 z-0 bg-cover bg-no-repeat"
        style={{ backgroundImage: `url(${bgImage})`, backgroundPosition: 'center 30%' }}
      />

      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="py-3 md:py-6 px-4 md:px-8 bg-white/40 border-b border-white/40 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto flex items-center justify-end">
            <nav className="flex gap-2">
              <NavLink to="/" className={navLinkClass}>
                المزايدة
              </NavLink>
              <NavLink to="/list" className={navLinkClass}>
                المزاد
              </NavLink>
              {session && (
                <button type="button" onClick={signOut} title="تسجيل الخروج"
                  className="px-3 py-2.5 rounded-full bg-white/60 text-gray-600 hover:bg-white/80 hover:text-gray-900 shadow-sm">
                  <LogOut size={18} aria-label="تسجيل الخروج" />
                </button>
              )}
            </nav>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
