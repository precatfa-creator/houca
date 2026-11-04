import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import Layout from './components/Layout';
import { SetupNotice } from './components/SetupNotice';
import { StaffOnly } from './components/StaffOnly';
import { supabase } from './lib/supabase';
import AdminPage from './pages/AdminPage';
import ListPage from './pages/ListPage';

/**
 * Root component: client-side routes and the global toast container.
 *
 * - `/`     — staff control panel, sign-in required ({@link AdminPage})
 * - `/list` — public auction board for a projector or TV ({@link ListPage})
 */
export default function App() {
  if (!supabase) return <SetupNotice />;

  return (
    <BrowserRouter>
      <Toaster position="top-center" richColors theme="light" />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<StaffOnly><AdminPage /></StaffOnly>} />
          <Route path="list" element={<ListPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
