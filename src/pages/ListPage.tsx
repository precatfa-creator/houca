import { useState, useMemo } from 'react';
import { useHorses } from '../hooks/useHorses';
import { Search, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ListPage() {
  const { horses, removeHorse } = useHorses();
  const [search, setSearch] = useState('');

  const filteredHorses = useMemo(() => {
    if (!search.trim()) return horses;
    return horses.filter(h => h.name.toLowerCase().includes(search.toLowerCase()));
  }, [horses, search]);

  return (
    <div className="max-w-4xl mx-auto w-full backdrop-blur-md bg-white/75 p-6 md:p-8 rounded-2xl shadow-xl border border-white/50 h-[calc(100vh-8rem)] flex flex-col relative overflow-hidden">
      <div className="absolute top-0 end-0 w-32 h-32 bg-amber-200/20 rounded-es-full pointer-events-none"></div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-br from-gray-900 to-gray-600 bg-clip-text text-transparent font-serif">قائمة المزاد</h1>
          <p className="text-sm text-gray-500 mt-1 tracking-widest font-semibold">{horses.length} مسجل</p>
        </div>
        
        <div className="relative w-full md:w-72">
          <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none">
            <Search className="text-gray-400 w-5 h-5" />
          </div>
          <input
            type="text"
            placeholder="البحث بالاسم..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full ps-10 pe-4 py-2.5 rounded-full border border-gray-200 bg-white/80 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all outline-none shadow-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pe-2 custom-scrollbar space-y-3 pb-8">
        <AnimatePresence>
          {filteredHorses.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 text-gray-500"
            >
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-lg font-medium">لم يتم العثور على قيود.</p>
              <p className="text-sm opacity-75 mt-1">جرب بحثًا مختلفًا أو قم بتسجيل حصان جديد.</p>
            </motion.div>
          ) : (
            filteredHorses.map((horse) => (
              <motion.div
                key={horse.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white/80 border border-gray-100 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-shadow group"
              >
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{horse.name}</h3>
                </div>
                
                <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-1/3">
                  <div className="text-amber-500 font-bold bg-amber-50 px-3 py-1 rounded-lg">
                    ${horse.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <button
                    onClick={() => removeHorse(horse.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                    title="حذف"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
