import { Outlet, NavLink } from 'react-router-dom';
import bgImage from '../assets/images/arabian_horse_bg_1780423320560.jpg';

export default function Layout() {
  return (
    <div className="min-h-screen relative font-sans text-gray-900 bg-white">
      {/* Background Image Setup */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${bgImage})` }}
      />

      {/* Main UI */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="py-6 px-4 md:px-8 bg-white/40 border-b border-white/40 sticky top-0">
          <div className="max-w-7xl mx-auto flex items-center justify-end">
            <nav className="flex gap-2">
              <NavLink
                to="/"
                className={({ isActive }) => 
                  `px-5 py-2.5 rounded-full font-semibold text-sm transition-all ${
                    isActive 
                      ? 'bg-gray-900 text-amber-400 shadow-md transform hover:-translate-y-0.5' 
                      : 'bg-white/60 text-gray-600 hover:bg-white/80 hover:text-gray-900 border border-transparent shadow-sm'
                  }`
                }
              >
                تسجيل
              </NavLink>
              <NavLink
                to="/list"
                className={({ isActive }) => 
                  `px-5 py-2.5 rounded-full font-semibold text-sm transition-all ${
                    isActive 
                      ? 'bg-gray-900 text-amber-400 shadow-md transform hover:-translate-y-0.5' 
                      : 'bg-white/60 text-gray-600 hover:bg-white/80 hover:text-gray-900 border border-transparent shadow-sm'
                  }`
                }
              >
                عرض السجل
              </NavLink>
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
