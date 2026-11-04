import { ImageOff } from 'lucide-react';
import { photoUrl } from '../lib/api';

/** Horse photo from storage, or a neutral placeholder when there is none. */
export function HorsePhoto({ path, alt, className }: { path: string | null; alt: string; className?: string }) {
  if (!path) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 text-gray-400 ${className ?? ''}`} aria-label="لا توجد صورة">
        <ImageOff className="w-1/3 h-1/3 max-w-12 max-h-12" aria-hidden />
      </div>
    );
  }
  return <img src={photoUrl(path)} alt={alt} loading="lazy" className={`object-cover ${className ?? ''}`} />;
}
