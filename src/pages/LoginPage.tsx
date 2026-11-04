import { useState, type FormEvent } from 'react';
import { signIn } from '../lib/api';
import { useAction } from '../hooks/useAction';

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none bg-white/80';

/**
 * Staff sign-in. Accounts are created by an administrator in the Supabase
 * dashboard; public sign-up is disabled.
 */
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { busy, run } = useAction();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    run(() => signIn(email.trim(), password));
  };

  return (
    <form onSubmit={handleSubmit}
      className="max-w-sm mx-auto mt-16 backdrop-blur-md bg-white/85 p-8 rounded-2xl shadow-xl border border-white/50 space-y-4">
      <h1 className="text-3xl font-bold font-serif mb-2">تسجيل الدخول</h1>
      <p className="text-sm text-gray-600">لوحة التحكم متاحة لإدارة المزاد فقط.</p>
      <div>
        <label htmlFor="email" className="block text-sm font-bold mb-1.5">البريد الإلكتروني</label>
        <input id="email" type="email" required autoComplete="username" dir="ltr" value={email}
          onChange={(e) => setEmail(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-bold mb-1.5">كلمة المرور</label>
        <input id="password" type="password" required autoComplete="current-password" dir="ltr" value={password}
          onChange={(e) => setPassword(e.target.value)} className={inputClass} />
      </div>
      <button type="submit" disabled={busy}
        className="w-full bg-gray-900 text-amber-400 font-bold py-3 rounded-xl hover:bg-gray-800 disabled:opacity-50">
        {busy ? 'جارٍ الدخول...' : 'دخول'}
      </button>
    </form>
  );
}
