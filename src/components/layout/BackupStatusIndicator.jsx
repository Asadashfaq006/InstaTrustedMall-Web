import React, { useEffect, useState } from 'react';
import { Database, CheckCircle2 } from 'lucide-react';
import useBackupStore from '../../stores/backupStore';

export default function BackupStatusIndicator({ businessId }) {
  const { backupSettings, lastScheduledBackup, loadBackupSettings } = useBackupStore();
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (businessId) loadBackupSettings(businessId);
  }, [businessId]);

  // Show a brief toast when a scheduled backup completes
  useEffect(() => {
    if (lastScheduledBackup) {
      setShowToast(true);
      const timer = setTimeout(() => setShowToast(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [lastScheduledBackup]);

  // Listen for scheduled backup events
  useEffect(() => {
    const handler = (data) => {
      if (data.businessId === businessId) {
        useBackupStore.getState().setLastScheduledBackup(data);
        loadBackupSettings(businessId);
      }
    };
    window.electronAPI.on('backup:scheduled_completed', handler);
    return () => window.electronAPI.removeListener('backup:scheduled_completed', handler);
  }, [businessId]);

  if (!backupSettings?.auto_backup_enabled) return null;

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-emerald-600 bg-emerald-50 rounded-md">
        <Database className="w-3 h-3" />
        <span>Auto</span>
      </div>

      {/* Toast notification for completed backup */}
      {showToast && (
        <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-emerald-600 text-white text-[10px] rounded-lg shadow-lg z-50 animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3" />
            <span>Auto-backup completed</span>
          </div>
        </div>
      )}
    </div>
  );
}
