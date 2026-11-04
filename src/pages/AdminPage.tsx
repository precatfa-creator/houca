import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { HorseFormDialog } from '../components/HorseFormDialog';
import { HorseList } from '../components/HorseList';
import { ImportControls } from '../components/ImportControls';
import { LiveAuctionPanel } from '../components/LiveAuctionPanel';
import { useAction } from '../hooks/useAction';
import { useAuctionData } from '../hooks/useAuctionData';
import { deleteHorse, reopenHorse, startAuction } from '../lib/api';
import { compareLots, type Horse } from '../lib/horses';

/** Which horse the add/edit dialog is open for: `null` adds a new horse. */
type EditTarget = { horse: Horse | null } | undefined;

/**
 * Staff control panel (`/`): the horse catalog beside the live-auction
 * controls. Everything updates in real time across all signed-in devices
 * and the public board.
 */
export default function AdminPage() {
  const { horses, reserves, activeHorseId, status } = useAuctionData(true);
  const [editing, setEditing] = useState<EditTarget>();
  const { busy, run } = useAction();

  const sortedHorses = useMemo(() => [...horses].sort(compareLots), [horses]);
  const existingLots = useMemo(() => new Set(horses.map((h) => h.lot)), [horses]);
  const activeHorse = horses.find((h) => h.id === activeHorseId) ?? null;

  const handleStart = (horse: Horse) => run(() => startAuction(horse.id), `بدأ المزاد على ${horse.name}`);
  const handleDelete = (horse: Horse) => run(() => deleteHorse(horse), 'تم حذف الحصان');
  const handleReopen = (horse: Horse) =>
    run(() => reopenHorse(horse.id), 'تم التراجع عن البيع وإعادة فتح المزاد');

  useEffect(() => {
    if (status === 'error') toast.error('تعذر تحميل البيانات. تحقق من الاتصال.', { id: 'load-error' });
  }, [status]);

  return (
    <div className="max-w-7xl mx-auto grid gap-6 lg:grid-cols-[1fr_26rem] items-start">
      <section className="backdrop-blur-md bg-white/85 rounded-2xl shadow-xl border border-white/50 p-4 md:p-6 order-2 lg:order-1">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h1 className="text-2xl font-bold font-serif">قائمة الخيول <span className="text-gray-400 text-lg">({horses.length})</span></h1>
          <div className="flex flex-wrap gap-2 items-start">
            <ImportControls existingLots={existingLots} />
            <button type="button" onClick={() => setEditing({ horse: null })}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-gray-900 text-amber-400 hover:bg-gray-800">
              <Plus size={16} aria-hidden /> إضافة حصان
            </button>
          </div>
        </div>
        {status === 'loading'
          ? <p className="text-center text-gray-500 py-12">جارٍ التحميل...</p>
          : <HorseList horses={sortedHorses} reserves={reserves} activeHorseId={activeHorseId} busy={busy}
              onStart={handleStart} onReopen={handleReopen} onDelete={handleDelete}
              onEdit={(horse) => setEditing({ horse })} />}
      </section>

      <section className="backdrop-blur-md bg-white/90 rounded-2xl shadow-xl border border-white/50 p-5 lg:sticky lg:top-28 order-1 lg:order-2">
        <div className="h-1 -mx-5 -mt-5 mb-5 rounded-t-2xl bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600" />
        <LiveAuctionPanel horse={activeHorse} reserve={activeHorse ? reserves.get(activeHorse.id) ?? null : null} />
      </section>

      {editing && (
        <HorseFormDialog horse={editing.horse} reserve={editing.horse ? reserves.get(editing.horse.id) ?? null : null}
          onClose={() => setEditing(undefined)} />
      )}
    </div>
  );
}
