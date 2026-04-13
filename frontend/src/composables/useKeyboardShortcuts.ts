import { onMounted, onBeforeUnmount } from 'vue';

export interface KeyboardShortcutsHandlers {
  onResetCamera?: () => void;
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutsHandlers) {
  const handleKeydown = (event: KeyboardEvent) => {
    // Shift+F works even inside inputs (doesn't write any character)
    if (event.shiftKey && event.key.toLowerCase() === 'f' && handlers.onResetCamera) {
      event.preventDefault();
      handlers.onResetCamera();
    }
  };

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeydown);
  });
}
