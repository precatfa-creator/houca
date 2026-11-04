import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { importHorses } from '../lib/api';
import { downloadImportTemplate, readImportSheet } from '../lib/excel';
import { localToday, missingImportColumns, parseImportRows, type ImportError } from '../lib/horses';
import { useAction } from '../hooks/useAction';

const MAX_LISTED_ERRORS = 20;

/**
 * "Download template" and "Import Excel" buttons. An import is validated in
 * full first; if any row is invalid nothing is saved and the row errors are
 * listed, otherwise all horses are inserted in one transaction.
 */
export function ImportControls({ existingLots }: { existingLots: ReadonlySet<string> }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<ImportError[]>([]);
  const { busy, run } = useAction();

  const importFile = async (file: File) => {
    setErrors([]);
    const sheet = await readImportSheet(file);
    const missing = missingImportColumns(sheet.headers);
    if (missing.length > 0) throw new Error(`أعمدة ناقصة في الملف: ${missing.join('، ')}`);

    const result = parseImportRows(sheet.rows, existingLots, localToday());
    setErrors(result.errors);
    if (result.errors.length > 0) throw new Error(`لم يتم الاستيراد: ${result.errors.length} خطأ في الملف`);
    if (result.horses.length === 0) throw new Error('الملف لا يحتوي على خيول');

    const count = await importHorses(result.horses);
    toast.success(`تم استيراد ${count} حصان`);
  };

  const handleFile = (file: File | undefined) => {
    if (fileInput.current) fileInput.current.value = ''; // allow re-selecting the same file
    if (file) run(() => importFile(file));
  };

  const buttonClass =
    'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50';

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={buttonClass} onClick={() => run(downloadImportTemplate)}>
          <Download size={16} aria-hidden /> تحميل القالب
        </button>
        <button type="button" className={buttonClass} disabled={busy} onClick={() => fileInput.current?.click()}>
          <Upload size={16} aria-hidden /> {busy ? 'جارٍ الاستيراد...' : 'استيراد Excel'}
        </button>
        <input ref={fileInput} type="file" hidden accept=".xlsx,.xls,.csv"
          onChange={(e) => handleFile(e.target.files?.[0])} />
      </div>

      {errors.length > 0 && (
        <div role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <div className="flex justify-between items-center mb-2">
            <strong>أخطاء الاستيراد (لم يتم حفظ أي حصان):</strong>
            <button type="button" onClick={() => setErrors([])} className="text-red-600 underline">إخفاء</button>
          </div>
          <ul className="space-y-1 max-h-48 overflow-y-auto">
            {errors.slice(0, MAX_LISTED_ERRORS).map((error, i) => (
              <li key={i}>السطر {error.row}: {error.message}</li>
            ))}
            {errors.length > MAX_LISTED_ERRORS && <li>... و{errors.length - MAX_LISTED_ERRORS} أخطاء أخرى</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
