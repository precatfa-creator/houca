import { useState, type FormEvent } from 'react';
import { Eye, EyeOff } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);
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
        <div className="flex items-center rounded-xl border border-gray-200 bg-white/80 transition focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/20">
          <input id="password" type={showPassword ? 'text' : 'password'} required autoComplete="current-password" dir="ltr"
            value={password} onChange={(e) => setPassword(e.target.value)}
            className="min-w-0 flex-1 bg-transparent px-4 py-3 outline-none" />
          <button type="button" onClick={() => setShowPassword((shown) => !shown)}
            aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'} aria-pressed={showPassword}
            title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
            className="me-1 grid size-10 shrink-0 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
            {showPassword ? <EyeOff size={20} aria-hidden /> : <Eye size={20} aria-hidden />}
          </button>
        </div>
      </div>
      <button type="submit" disabled={busy}
        className="w-full bg-gray-900 text-amber-400 font-bold py-3 rounded-xl hover:bg-gray-800 disabled:opacity-50">
        {busy ? 'جارٍ الدخول...' : 'دخول'}
      </button>
    </form>
  );
}
