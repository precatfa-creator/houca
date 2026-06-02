/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import Layout from './components/Layout';
import RegisterPage from './pages/RegisterPage';
import ListPage from './pages/ListPage';

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
