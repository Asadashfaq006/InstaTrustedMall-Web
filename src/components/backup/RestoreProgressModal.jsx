import React from 'react';
import { Database, Shield, RotateCcw, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

export default function RestoreProgressModal({ progress, result, onClose }) {
  const steps = [
    { id: 'creating_safety_backup', label: 'Creating safety backup...' },
    { id: 'restoring', label: 'Restoring database...' },
    { id: 'completed', label: 'Restore complete!' },
    { id: 'failed', label: 'Restore failed' },
  ];

  const isDone = progress === 'completed' || progress === 'failed';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="flex flex-col items-center text-center">
          {/* Icon */}
          {progress === 'completed' ? (
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
          ) : progress === 'failed' ? (
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-[#5B6EAE]/10 flex items-center justify-center mb-4">
              <RefreshCw className="w-8 h-8 text-[#5B6EAE] animate-spin" />
            </div>
          )}

          {/* Title */}
          <h3 className="text-lg font-bold text-[#1E3A5F] mb-2">
            {progress === 'completed'
              ? 'Restore Successful'
              : progress === 'failed'
              ? 'Restore Failed'
              : 'Restoring Data...'}
          </h3>

          {/* Progress steps */}
          <div className="w-full space-y-2 mb-6">
            {steps.slice(0, progress === 'failed' ? 4 : 3).map((step) => {
              const isCurrent = step.id === progress;
              const isPast =
                steps.findIndex((s) => s.id === progress) >
                steps.findIndex((s) => s.id === step.id);

              if (step.id === 'failed' && progress !== 'failed') return null;

              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                    isCurrent
                      ? step.id === 'failed'
                        ? 'bg-red-50 text-red-700'
                        : step.id === 'completed'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-[#5B6EAE]/5 text-[#5B6EAE]'
                      : isPast
                      ? 'text-emerald-600'
                      : 'text-gray-400'
                  }`}
                >
                  {isPast ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  ) : isCurrent && step.id !== 'completed' && step.id !== 'failed' ? (
                    <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" />
                  ) : isCurrent && step.id === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  ) : isCurrent && step.id === 'failed' ? (
                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
                  )}
                  {step.label}
                </div>
              );
            })}
          </div>

          {/* Error message */}
          {progress === 'failed' && result?.error && (
            <p className="text-xs text-red-600 mb-4">{result.error}</p>
          )}

          {/* Safety backup note */}
          {progress === 'completed' && result?.preRestoreBackupPath && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg mb-4 text-xs text-blue-700">
              <Shield className="w-4 h-4 flex-shrink-0" />
              <span>Safety backup saved before restore</span>
            </div>
          )}

          {/* Action button */}
          {isDone && (
            <button
              onClick={onClose}
              className={`px-6 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                progress === 'completed'
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
            >
              {progress === 'completed' ? 'Reload App' : 'Close'}
            </button>
          )}

          {!isDone && (
            <p className="text-xs text-gray-400">Please don't close the app during restore...</p>
          )}
        </div>
      </div>
    </div>
  );
}
