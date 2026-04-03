/**
 * Keyboard Shortcuts - Global keyboard shortcut handler for InstaMall.
 *
 * Shortcuts:
 *   Ctrl+N  → New Demand (/demands/new)
 *   Ctrl+P  → Products (/products)
 *   Ctrl+F  → Focus search (dispatches custom event)
 *   Ctrl+S  → Save (dispatches custom event)
 *   Ctrl+/  → Show keyboard shortcuts help
 *   Escape  → Close topmost modal (dispatches custom event)
 *   Ctrl+D  → Dashboard (/dashboard)
 *   Ctrl+B  → Buyers (/buyers)
 */

export const SHORTCUTS = [
  { keys: ['Ctrl', 'N'], description: 'New Demand', action: 'navigate', target: '/demands/new' },
  { keys: ['Ctrl', 'D'], description: 'Go to Dashboard', action: 'navigate', target: '/dashboard' },
  { keys: ['Ctrl', 'P'], description: 'Go to Products', action: 'navigate', target: '/products' },
  { keys: ['Ctrl', 'B'], description: 'Go to Buyers', action: 'navigate', target: '/buyers' },
  { keys: ['Ctrl', 'F'], description: 'Focus Search', action: 'event', target: 'shortcut:focus-search' },
  { keys: ['Ctrl', 'S'], description: 'Save Current', action: 'event', target: 'shortcut:save' },
  { keys: ['Ctrl', '/'], description: 'Show Shortcuts Help', action: 'event', target: 'shortcut:show-help' },
  { keys: ['Escape'], description: 'Close Modal / Cancel', action: 'event', target: 'shortcut:escape' },
];

/**
 * Create a global keyboard shortcut listener.
 * @param {Function} navigate - react-router navigate function
 * @returns {{ attach: () => void, detach: () => void }}
 */
export function createShortcutListener(navigate) {
  const handler = (e) => {
    // Don't trigger shortcuts when typing in inputs/textareas
    const tag = e.target?.tagName?.toLowerCase();
    const isEditable = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable;

    // Allow Escape and Ctrl+/ even in inputs
    const isEscape = e.key === 'Escape';
    const isHelp = e.ctrlKey && e.key === '/';
    const isSave = e.ctrlKey && e.key === 's';

    if (isEditable && !isEscape && !isHelp && !isSave) return;

    if (e.ctrlKey && !e.shiftKey && !e.altKey) {
      switch (e.key.toLowerCase()) {
        case 'n':
          e.preventDefault();
          navigate('/demands/new');
          break;
        case 'd':
          e.preventDefault();
          navigate('/dashboard');
          break;
        case 'p':
          e.preventDefault();
          navigate('/products');
          break;
        case 'b':
          e.preventDefault();
          navigate('/buyers');
          break;
        case 'f':
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('shortcut:focus-search'));
          break;
        case 's':
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('shortcut:save'));
          break;
        case '/':
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('shortcut:show-help'));
          break;
        default:
          break;
      }
    }

    if (isEscape) {
      window.dispatchEvent(new CustomEvent('shortcut:escape'));
    }
  };

  return {
    attach: () => window.addEventListener('keydown', handler),
    detach: () => window.removeEventListener('keydown', handler),
  };
}
