import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import Layout from './components/Layout';
import RegisterPage from './pages/RegisterPage';
import ListPage from './pages/ListPage';

/**
 * Root component: client-side routes and the global toast container.
 *
 * - `/`     — operator control panel ({@link RegisterPage})
 * - `/list` — public auction board for a projector or TV ({@link ListPage})
 */
export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" richColors theme="light" />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<RegisterPage />} />
          <Route path="list" element={<ListPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
