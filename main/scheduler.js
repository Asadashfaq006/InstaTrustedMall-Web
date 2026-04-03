// main/scheduler.js – Auto-backup scheduler
// Checks every 60 seconds if any business has a pending scheduled backup

const path = require('path');
const fs = require('fs');

let intervalId = null;
let dbRef = null;
let mainWindowRef = null;

function startBackupScheduler(getDb, mainWindow) {
  dbRef = getDb;
  mainWindowRef = mainWindow;

  // Check every 60 seconds
  intervalId = setInterval(() => {
    try {
      runScheduledBackups();
    } catch (err) {
      console.error('[Scheduler] Error running scheduled backups:', err.message);
    }
  }, 60_000);

  console.log('[Scheduler] Auto-backup scheduler started (60s interval)');
}

function stopBackupScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function runScheduledBackups() {
  const db = typeof dbRef === 'function' ? dbRef() : dbRef;
  if (!db || !db.open) return;

  // Get all businesses with auto-backup enabled
  const businesses = db.prepare(`
    SELECT a.business_id, a.auto_backup_frequency, a.auto_backup_time,
           a.auto_backup_folder, a.max_backup_copies, a.last_backup_at,
           b.name as business_name
    FROM app_settings a
    LEFT JOIN businesses b ON b.id = a.business_id
    WHERE a.auto_backup_enabled = 1
  `).all();

  if (businesses.length === 0) return;

  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"

  for (const biz of businesses) {
    if (!shouldBackupNow(biz, now, currentTime)) continue;

    console.log(`[Scheduler] Running auto-backup for business: ${biz.business_name} (${biz.business_id})`);

    try {
      const { app } = require('electron');
      const { logAudit } = require('./auditLogger');
      const Database = require('better-sqlite3');

      // Build filename
      const safeName = (biz.business_name || 'Business').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = now.toTimeString().slice(0, 5).replace(':', '-');
      const filename = `InstaMall_Backup_${safeName}_${dateStr}_${timeStr}.db`;

      // Determine folder
      let folder = biz.auto_backup_folder;
      if (!folder) folder = path.join(app.getPath('documents'), 'InstaMall Backups');
      fs.mkdirSync(folder, { recursive: true });

      const destPath = path.join(folder, filename);

      // VACUUM INTO for atomic backup
      db.exec(`VACUUM INTO '${destPath.replace(/'/g, "''")}'`);

      const stats = fs.statSync(destPath);

      // Log backup
      db.prepare(`
        INSERT INTO backup_log (business_id, filename, file_path, file_size_bytes, trigger_type, status)
        VALUES (?, ?, ?, ?, 'scheduled', 'success')
      `).run(biz.business_id, filename, destPath, stats.size);

      db.prepare("UPDATE app_settings SET last_backup_at = datetime('now') WHERE business_id = ?")
        .run(biz.business_id);

      // Enforce max copies
      const maxCopies = biz.max_backup_copies || 10;
      if (maxCopies > 0) {
        const allBackups = db.prepare(
          "SELECT id, file_path FROM backup_log WHERE business_id = ? AND status = 'success' ORDER BY created_at DESC"
        ).all(biz.business_id);
        if (allBackups.length > maxCopies) {
          const toDelete = allBackups.slice(maxCopies);
          const delStmt = db.prepare('DELETE FROM backup_log WHERE id = ?');
          for (const old of toDelete) {
            try { if (fs.existsSync(old.file_path)) fs.unlinkSync(old.file_path); } catch (_) {}
            delStmt.run(old.id);
          }
        }
      }

      logAudit(db, {
        businessId: biz.business_id,
        userId: null, userLabel: 'System',
        action: 'BACKUP_CREATED', entityType: 'backup',
        entityLabel: filename,
        summary: `Scheduled auto-backup created: ${filename}`,
      });

      // Notify renderer
      if (mainWindowRef && !mainWindowRef.isDestroyed()) {
        mainWindowRef.webContents.send('backup:scheduled_completed', {
          businessId: biz.business_id,
          filename, filePath: destPath,
          fileSizeBytes: stats.size,
          createdAt: now.toISOString(),
        });
      }

      console.log(`[Scheduler] Auto-backup completed: ${filename}`);
    } catch (err) {
      console.error(`[Scheduler] Auto-backup failed for ${biz.business_name}:`, err.message);
      try {
        db.prepare(
          "INSERT INTO backup_log (business_id, filename, file_path, file_size_bytes, trigger_type, status, error_message) VALUES (?, 'scheduled_failed', '', 0, 'scheduled', 'failed', ?)"
        ).run(biz.business_id, err.message);
      } catch (_) {}
    }
  }
}

function shouldBackupNow(biz, now, currentTime) {
  // Only trigger at the configured time (minute-level match)
  const scheduledTime = biz.auto_backup_time || '23:00';
  if (currentTime !== scheduledTime) return false;

  // Check frequency against last backup
  const lastBackup = biz.last_backup_at ? new Date(biz.last_backup_at) : null;
  if (!lastBackup) return true; // Never backed up — do it now

  const hoursSinceLast = (now - lastBackup) / (1000 * 60 * 60);

  switch (biz.auto_backup_frequency) {
    case 'hourly':
      return hoursSinceLast >= 0.9; // ~54 minutes
    case 'daily':
      return hoursSinceLast >= 22;  // ~22 hours  
    case 'weekly':
      return hoursSinceLast >= 166; // ~6.9 days
    default:
      return hoursSinceLast >= 22;
  }
}

module.exports = { startBackupScheduler, stopBackupScheduler };
