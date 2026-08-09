import { useEffect, useRef, useState } from 'react';
import type { MessageTone } from '../../components/common';
import { translateRuntimeText } from '../../features/settings/services/localization';

type ConfirmState = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  resolver: ((value: boolean) => void) | null;
};

export function useAppFeedback(locale: 'id' | 'en', initialMessage: string) {
  const [message, setMessage] = useState(initialMessage);
  const [messageTone, setMessageTone] = useState<MessageTone>('info');
  const [toastVisible, setToastVisible] = useState(false);
  const [debugError, setDebugError] = useState('');
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    open: false,
    title: '',
    message: '',
    confirmLabel: '',
    cancelLabel: '',
    resolver: null,
  });
  const didMountRef = useRef(false);
  const displayMessage = translateRuntimeText(message, locale);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    if (!message) {
      setToastVisible(false);
      return;
    }
    setToastVisible(true);
    const timer = window.setTimeout(() => setToastVisible(false), 2800);
    return () => window.clearTimeout(timer);
  }, [message, messageTone]);

  const requestConfirmAction = (title: string, msg: string, confirmLabel = '', cancelLabel = '') =>
    new Promise<boolean>((resolve) => {
      setConfirmState({ open: true, title, message: msg, confirmLabel, cancelLabel, resolver: resolve });
    });

  const closeConfirm = (value: boolean) => {
    setConfirmState((current) => {
      current.resolver?.(value);
      return { open: false, title: '', message: '', confirmLabel: '', cancelLabel: '', resolver: null };
    });
  };

  return {
    message,
    setMessage,
    messageTone,
    setMessageTone,
    toastVisible,
    setToastVisible,
    debugError,
    setDebugError,
    confirmState,
    setConfirmState,
    requestConfirmAction,
    closeConfirm,
    displayMessage,
  };
}
