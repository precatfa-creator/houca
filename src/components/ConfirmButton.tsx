import { useEffect, useState, type ReactNode } from 'react';

interface ConfirmButtonProps {
  /** Runs on the second click. */
  onConfirm: () => void;
  /** Label shown after the first click, asking the operator to click again. */
  confirmLabel: ReactNode;
  children: ReactNode;
  className?: string;
  armedClassName?: string;
  disabled?: boolean;
  title?: string;
}

const ARMED_MS = 3000;

/**
 * Button for destructive or override actions: the first click arms it and
 * shows `confirmLabel`, a second click within 3 seconds runs `onConfirm`.
 * Used instead of `window.confirm`, which blocks the page and cannot be
 * styled or localised.
 */
export function ConfirmButton({ onConfirm, confirmLabel, children, className, armedClassName, disabled, title }: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timeout = setTimeout(() => setArmed(false), ARMED_MS);
    return () => clearTimeout(timeout);
  }, [armed]);

  const handleClick = () => {
    if (!armed) return setArmed(true);
    setArmed(false);
    onConfirm();
  };

  return (
    <button type="button" onClick={handleClick} disabled={disabled} title={title}
      className={armed && armedClassName ? armedClassName : className}>
      {armed ? confirmLabel : children}
    </button>
  );
}
