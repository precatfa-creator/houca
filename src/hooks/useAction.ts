import { useState } from 'react';
import { toast } from 'sonner';

/**
 * Runs async operator actions one at a time: `busy` disables buttons while
 * a request is in flight (no double bids from double clicks), failures are
 * shown as toasts with the Arabic message from `lib/api`, and an optional
 * success message is toasted on completion.
 */
export function useAction() {
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<unknown>, successMessage?: string): Promise<boolean> => {
    setBusy(true);
    try {
      await action();
      if (successMessage) toast.success(successMessage);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
      return false;
    } finally {
      setBusy(false);
    }
  };

  return { busy, run };
}
