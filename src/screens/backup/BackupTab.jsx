import React, { useState, useEffect, useCallback } from 'react';
import {
  Database, FolderOpen, Play, Clock, Trash2, Download,
  CheckCircle2, XCircle, AlertTriangle, Settings, RefreshCw,
} from 'lucide-react';
import useBackupStore from '../../stores/backupStore';
import { parseDbDate } from '@/lib/utils';

export default function BackupTab({ businessId, currentUser }) {
  const {
    backupLog, backupSettings, isBackingUp,
    createBackup, loadBackupLog, loadBackupSettings,
    updateBackupSettings, deleteLogEntry, clearOldBackups,
  } = useBackupStore();

  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    autoBackupEnabled: false,
    autoBackupFrequency: 'daily',
    autoBackupTime: '23:00',
    autoBackupFolder: '',
    maxBackupCopies: 10,
  });
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (backupSettings) {
      setSettingsForm({
        autoBackupEnabled: !!backupSettings.auto_backup_enabled,
        autoBackupFrequency: backupSettings.auto_backup_frequency || 'daily',
        autoBackupTime: backupSettings.auto_backup_time || '23:00',
        autoBackupFolder: backupSettings.auto_backup_folder || '',
        maxBackupCopies: backupSettings.max_backup_copies || 10,
      });
    }
  }, [backupSettings]);

  const handleCreateBackup = async () => {
    setMsg(null);
    const res = await createBackup({
      businessId,
      userId: currentUser?.id,
      userLabel: currentUser?.display_name || currentUser?.username || 'Unknown',
      triggerType: 'manual',
    });
    if (res.success) {
      setMsg({ type: 'success', text: `Backup created: ${res.data.filename}` });
    } else {
      setMsg({ type: 'error', text: `Backup failed: ${res.error}` });
    }
  };

  const handleChooseFolder = async () => {
    const res = await window.electronAPI.backup.chooseFolder();
    if (res.success) {
      setSettingsForm((f) => ({ ...f, autoBackupFolder: res.folderPath }));
    }
  };

  const handleSaveSettings = async () => {
    const res = await updateBackupSettings({
      businessId,
      userId: currentUser?.id,
      userLabel: currentUser?.display_name || currentUser?.username || 'Unknown',
      ...settingsForm,
    });
    if (res.success) {
      setMsg({ type: 'success', text: 'Backup settings saved' });
      setShowSettings(false);
    } else {
      setMsg({ type: 'error', text: res.error });
    }
  };

  const handleDeleteEntry = async (logId) => {
    if (!confirm('Delete this backup record and file?')) return;
    await deleteLogEntry({ logId, deleteFile: true, businessId });
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Action bar */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-[#1E3A5F]">Create Backup</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Creates a complete copy of your database using atomic VACUUM INTO
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Schedule
            </button>
            <button
              onClick={handleCreateBackup}
              disabled={isBackingUp}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-[#5B6EAE] rounded-lg hover:bg-[#4A5D9D] disabled:opacity-60 transition-colors"
            >
              {isBackingUp ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {isBackingUp ? 'Backing up...' : 'Backup Now'}
            </button>
          </div>
        </div>

        {/* Message */}
        {msg && (
          <div
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm ${
              msg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {msg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            {msg.text}
          </div>
        )}
      </div>

      {/* Auto-backup settings panel */}
      {showSettings && (
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h3 className="text-sm font-semibold text-[#1E3A5F]">Auto-Backup Schedule</h3>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settingsForm.autoBackupEnabled}
              onChange={(e) =>
                setSettingsForm((f) => ({ ...f, autoBackupEnabled: e.target.checked }))
              }
              className="w-4 h-4 rounded border-gray-300 text-[#5B6EAE] focus:ring-[#5B6EAE]"
            />
            <span className="text-sm text-gray-700">Enable auto-backup</span>
          </label>

          {settingsForm.autoBackupEnabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Frequency</label>
                <select
                  value={settingsForm.autoBackupFrequency}
                  onChange={(e) =>
                    setSettingsForm((f) => ({ ...f, autoBackupFrequency: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5B6EAE]/30 focus:border-[#5B6EAE]"
                >
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Time</label>
                <input
                  type="time"
                  value={settingsForm.autoBackupTime}
                  onChange={(e) =>
                    setSettingsForm((f) => ({ ...f, autoBackupTime: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5B6EAE]/30 focus:border-[#5B6EAE]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Max copies to keep</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={settingsForm.maxBackupCopies}
                  onChange={(e) =>
                    setSettingsForm((f) => ({ ...f, maxBackupCopies: parseInt(e.target.value) || 10 }))
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5B6EAE]/30 focus:border-[#5B6EAE]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Backup folder</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={settingsForm.autoBackupFolder || 'Default (Documents)'}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50 truncate"
                  />
                  <button
                    onClick={handleChooseFolder}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <FolderOpen className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowSettings(false)}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSettings}
              className="px-4 py-2 text-sm font-medium text-white bg-[#5B6EAE] rounded-lg hover:bg-[#4A5D9D]"
            >
              Save Schedule
            </button>
          </div>
        </div>
      )}

      {/* Backup history */}
      <div className="bg-white rounded-xl border">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-sm font-semibold text-[#1E3A5F]">Backup History</h3>
          {backupLog.length > 3 && (
            <button
              onClick={() => clearOldBackups({ businessId, keepRecent: 3 })}
              className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Keep only last 3
            </button>
          )}
        </div>

        {backupLog.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-gray-400">
            <Database className="w-8 h-8 mx-auto mb-2 opacity-40" />
            No backups yet. Create your first backup above.
          </div>
        ) : (
          <div className="divide-y">
            {backupLog.map((entry) => (
              <div key={entry.id} className="flex items-center gap-4 px-6 py-3">
                {entry.status === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{entry.filename}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                    <span>{parseDbDate(entry.created_at)?.toLocaleString()}</span>
                    <span>{formatSize(entry.file_size_bytes)}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      entry.trigger_type === 'manual'
                        ? 'bg-blue-50 text-blue-600'
                        : entry.trigger_type === 'scheduled'
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-amber-50 text-amber-600'
                    }`}>
                      {entry.trigger_type}
                    </span>
                  </div>
                  {entry.error_message && (
                    <p className="text-xs text-red-500 mt-0.5">{entry.error_message}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteEntry(entry.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
