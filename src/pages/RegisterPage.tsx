import { useState } from 'react';
import { useHorses } from '../hooks/useHorses';
import { toast } from 'sonner';

export default function RegisterPage() {
  const { addHorse } = useHorses();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('اسم الحصان مطلوب');
      return;
    }
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      toast.error('الرجاء إدخال سعر صحيح');
      return;
    }

    addHorse({ name: name.trim(), price: numPrice });
    toast.success(`تم تسجيل ${name} بنجاح!`);
    setName('');
    setPrice('');
  };

  return (
    <div className="max-w-md mx-auto w-full backdrop-blur-md bg-white/70 p-8 rounded-2xl shadow-xl border border-white/50 relative overflow-hidden">
      <div className="absolute top-0 start-0 w-full h-1 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600"></div>
      <h1 className="text-3xl font-bold bg-gradient-to-br from-gray-900 to-gray-600 bg-clip-text text-transparent mb-6 font-serif">تسجيل الخيل العربية</h1>
      
      <p className="text-gray-600 mb-8 border-s-4 border-amber-400 ps-4 py-1 text-sm bg-amber-50/50 rounded-e-md leading-relaxed">
        أدخل تفاصيل الحصان العربي أدناه لإضافته إلى المزاد.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-base font-bold text-gray-800 tracking-wider mb-2">اسم الحصان</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-5 py-4 text-lg rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all outline-none bg-white/80 shadow-inner"
          />
        </div>

        <div>
          <label htmlFor="price" className="block text-base font-bold text-gray-800 tracking-wider mb-2">السعر ($)</label>
          <div className="relative">
            <div className="absolute inset-y-0 start-0 ps-4 flex items-center pointer-events-none">
              <span className="text-gray-400 font-medium text-lg">$</span>
            </div>
            <input
              id="price"
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full ps-10 pe-4 py-4 text-lg rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all outline-none bg-white/80 shadow-inner"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-gradient-to-r from-gray-900 to-gray-800 text-amber-400 hover:from-gray-800 hover:to-gray-700 font-bold py-5 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 tracking-widest text-lg mt-4"
        >
          تسجيل البيانات
        </button>
      </form>
    </div>
  );
}
