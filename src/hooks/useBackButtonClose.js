import { useEffect, useRef } from "react";
import { pushBackEntry, popBackEntry } from "../lib/backStack";

// Wire an open overlay (article, drawer, modal) into the back-button stack
// so the hardware/gesture back button closes it instead of leaving the app.
export function useBackButtonClose(isOpen, onClose) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const close = () => onCloseRef.current();
    pushBackEntry(close);
    return () => popBackEntry(close);
  }, [isOpen]);
}
