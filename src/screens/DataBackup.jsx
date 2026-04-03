import React, { useState, useEffect } from 'react';
import { Database, Download, Upload, RotateCcw, Settings, Shield, HardDrive } from 'lucide-react';
import useBusinessStore from '../stores/businessStore';
import useBackupStore from '../stores/backupStore';
import useAuthStore from '../stores/authStore';
import BackupTab from './backup/BackupTab';
import RestoreTab from './backup/RestoreTab';
import ImportTab from './backup/ImportTab';
import ExportTab from './backup/ExportTab';

const TABS = [
  { id: 'backup', label: 'Backup', icon: Database, description: 'Create & schedule backups' },
  { id: 'restore', label: 'Restore', icon: RotateCcw, description: 'Restore from backup file' },
  { id: 'import', label: 'Import', icon: Upload, description: 'Import products & buyers' },
  { id: 'export', label: 'Export', icon: Download, description: 'Export data to file' },
];

export default function DataBackup() {
  const [activeTab, setActiveTab] = useState('backup');
  const activeBusiness = useBusinessStore((s) => s.activeBusiness);
  const currentUser = useAuthStore((s) => s.currentUser);
  const { loadBackupLog, loadBackupSettings, backupSettings, backupLog } = useBackupStore();

  useEffect(() => {
    if (activeBusiness?.id) {
      loadBackupLog(activeBusiness.id);
      loadBackupSettings(activeBusiness.id);
    }
  }, [activeBusiness?.id]);

  // Listen for scheduled backup completions
  useEffect(() => {
    const handler = (data) => {
      if (data.businessId === activeBusiness?.id) {
        loadBackupLog(activeBusiness.id);
        loadBackupSettings(activeBusiness.id);
      }
    };
    window.electronAPI.on('backup:scheduled_completed', handler);
    return () => window.electronAPI.removeListener('backup:scheduled_completed', handler);
  }, [activeBusiness?.id]);

  if (!activeBusiness) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Please select a business first.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b px-6 py-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-lg bg-[#5B6EAE]/10">
            <HardDrive className="w-5 h-5 text-[#5B6EAE]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1E3A5F]">Data & Backup</h1>
            <p className="text-sm text-gray-500">Manage backups, restore data, import & export</p>
          </div>
        </div>

        {/* Quick stats bar */}
        <div className="flex items-center gap-6 mt-3 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            <span>
              Last backup:{' '}
              {backupSettings?.last_backup_at
                ? new Date(backupSettings.last_backup_at).toLocaleString()
                : 'Never'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5" />
            <span>{backupLog.filter((b) => b.status === 'success').length} backups on record</span>
          </div>
          {backupSettings?.auto_backup_enabled ? (
            <div className="flex items-center gap-1.5 text-emerald-600">
              <Settings className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
              <span>Auto-backup: {backupSettings.auto_backup_frequency} at {backupSettings.auto_backup_time}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-amber-600">
              <Settings className="w-3.5 h-3.5" />
              <span>Auto-backup: Off</span>
            </div>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex-shrink-0 bg-white border-b px-6">
        <div className="flex gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  active
                    ? 'border-[#5B6EAE] text-[#5B6EAE]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'backup' && (
          <BackupTab businessId={activeBusiness.id} currentUser={currentUser} />
        )}
        {activeTab === 'restore' && (
          <RestoreTab businessId={activeBusiness.id} currentUser={currentUser} />
        )}
        {activeTab === 'import' && (
          <ImportTab businessId={activeBusiness.id} currentUser={currentUser} />
        )}
        {activeTab === 'export' && (
          <ExportTab businessId={activeBusiness.id} currentUser={currentUser} />
        )}
      </div>
    </div>
  );
}
