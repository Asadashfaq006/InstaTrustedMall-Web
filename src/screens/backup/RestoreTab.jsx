import React, { useState } from 'react';
import {
  RotateCcw, FileSearch, CheckCircle2, XCircle, AlertTriangle,
  Shield, Database, Users, Package, ShoppingCart, RefreshCw,
} from 'lucide-react';
import useBackupStore from '../../stores/backupStore';
import RestoreProgressModal from '../../components/backup/RestoreProgressModal';

export default function RestoreTab({ businessId, currentUser }) {
  const { verifyBackupFile, restoreBackup, isRestoring, restoreProgress, clearRestoreProgress } = useBackupStore();

  const [selectedFile, setSelectedFile] = useState(null);
  const [verification, setVerification] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [restoreResult, setRestoreResult] = useState(null);

  const handleChooseFile = async () => {
    setVerification(null);
    setRestoreResult(null);
    const res = await window.electronAPI.backup.chooseFile();
    if (res.success) {
      setSelectedFile(res.filePath);
      // Auto-verify
      setIsVerifying(true);
      const verifyRes = await verifyBackupFile(res.filePath);
      setIsVerifying(false);
      if (verifyRes.success) setVerification(verifyRes.data);
    }
  };

  const handleRestore = async () => {
    setShowConfirm(false);
    setRestoreResult(null);
    const res = await restoreBackup({
      businessId,
      userId: currentUser?.id,
      userLabel: currentUser?.display_name || currentUser?.username || 'Unknown',
      backupFilePath: selectedFile,
    });
    setRestoreResult(res);
  };

  const handleRestoreComplete = () => {
    clearRestoreProgress();
    if (restoreResult?.success) {
      // Reload the app to get fresh data
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Restore progress modal */}
      {(isRestoring || restoreProgress) && (
        <RestoreProgressModal
          progress={restoreProgress}
          result={restoreResult}
          onClose={handleRestoreComplete}
        />
      )}

      {/* Warning banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-amber-800">Restore replaces all data</h3>
          <p className="text-xs text-amber-700 mt-1">
            Restoring from a backup will replace your entire database with the backup's data.
            A safety backup is automatically created before restoration so you can undo this action.
          </p>
        </div>
      </div>

      {/* File selection */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold text-[#1E3A5F] mb-4">Select Backup File</h2>

        <button
          onClick={handleChooseFile}
          disabled={isRestoring}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-2 border-dashed border-gray-300 rounded-lg hover:border-[#5B6EAE] hover:bg-[#5B6EAE]/5 transition-colors w-full justify-center"
        >
          <FileSearch className="w-4 h-4" />
          {selectedFile ? 'Choose Different File' : 'Browse for .db Backup File'}
        </button>

        {selectedFile && (
          <div className="mt-3 px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700 truncate">
            {selectedFile}
          </div>
        )}
      </div>

      {/* Verification loading */}
      {isVerifying && (
        <div className="bg-white rounded-xl border p-6 flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-[#5B6EAE] animate-spin" />
          <span className="text-sm text-gray-600">Verifying backup file...</span>
        </div>
      )}

      {/* Verification results */}
      {verification && (
        <div className="bg-white rounded-xl border p-6">
          {!verification.valid ? (
            <div className="flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-500" />
              <div>
                <h3 className="text-sm font-semibold text-red-700">Invalid Backup File</h3>
                <p className="text-xs text-red-600 mt-0.5">{verification.error}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <div>
                  <h3 className="text-sm font-semibold text-emerald-700">Valid Backup File</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    File size: {verification.fileSizeFormatted} • Estimated date:{' '}
                    {new Date(verification.estimatedBackupDate).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Business names */}
              {verification.businessNames?.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-600 mb-1">Businesses in backup:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {verification.businessNames.map((b, i) => (
                      <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                        {b.name} ({b.type})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Record counts */}
              <div className="grid grid-cols-4 gap-3 mb-5">
                {[
                  { label: 'Products', count: verification.tables?.products, icon: Package, color: 'text-blue-600 bg-blue-50' },
                  { label: 'Buyers', count: verification.tables?.buyers, icon: Users, color: 'text-purple-600 bg-purple-50' },
                  { label: 'Demands', count: verification.tables?.demands, icon: ShoppingCart, color: 'text-emerald-600 bg-emerald-50' },
                  { label: 'Users', count: verification.tables?.users, icon: Shield, color: 'text-amber-600 bg-amber-50' },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className={`flex items-center gap-2 p-3 rounded-lg ${item.color.split(' ')[1]}`}>
                      <Icon className={`w-4 h-4 ${item.color.split(' ')[0]}`} />
                      <div>
                        <p className="text-lg font-bold text-gray-800">{item.count ?? 0}</p>
                        <p className="text-[10px] text-gray-500">{item.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Restore button */}
              {!showConfirm ? (
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={isRestoring}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Restore This Backup
                </button>
              ) : (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-semibold text-red-800 mb-3">
                    Confirm: This will replace ALL current data with the backup. Are you sure?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleRestore}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                    >
                      Yes, Restore Now
                    </button>
                    <button
                      onClick={() => setShowConfirm(false)}
                      className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Post-restore result */}
      {restoreResult && !isRestoring && (
        <div className={`rounded-xl border p-6 ${restoreResult.success ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          {restoreResult.success ? (
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="text-sm font-semibold text-emerald-800">Restore Successful!</h3>
                <p className="text-xs text-emerald-700 mt-0.5">
                  A safety backup was saved before the restore. The page will reload to apply changes.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-600" />
              <div>
                <h3 className="text-sm font-semibold text-red-800">Restore Failed</h3>
                <p className="text-xs text-red-700 mt-0.5">{restoreResult.error}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
