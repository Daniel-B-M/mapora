import { onMounted, onBeforeUnmount } from 'vue';

export interface KeyboardShortcutsHandlers {
  onResetCamera?: () => void;
  onLogCamera?: () => void;
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutsHandlers) {
  const handleKeydown = (event: KeyboardEvent) => {
    // Avoid triggering shortcuts if the user is typing in an input
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    if (event.key.toLowerCase() === 'f' && handlers.onResetCamera) {
      handlers.onResetCamera();
    }
    
    if (event.key.toLowerCase() === 'c' && handlers.onLogCamera) {
      handlers.onLogCamera();
    }
  };

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeydown);
  });
}
