/**
 * KeyboardShortcutsHelp - Modal dialog showing all available keyboard shortcuts.
 */
import React from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { SHORTCUTS } from '@/utils/keyboardShortcuts';
import { Keyboard } from 'lucide-react';

export default function KeyboardShortcutsHelp({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-4 h-4" /> Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>Quick actions available throughout the app</DialogDescription>
        </DialogHeader>

        <div className="space-y-1 py-2">
          {SHORTCUTS.map((shortcut, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50"
            >
              <span className="text-sm text-text-primary">{shortcut.description}</span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, ki) => (
                  <kbd
                    key={ki}
                    className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded shadow-sm"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-text-muted text-center mt-2">
          Press <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px]">Ctrl</kbd>+<kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px]">/</kbd> anytime to show this help
        </p>
      </DialogContent>
    </Dialog>
  );
}
