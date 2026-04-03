/**
 * Module 6: Audit Logger Utility
 * Append-only audit log writer. NEVER update or delete rows.
 * Updated in M8 to include userId and userLabel.
 */

function logAudit(db, { businessId, userId, userLabel, action, entityType, entityId, entityLabel, summary, detailJson }) {
  try {
    db.prepare(`
      INSERT INTO audit_log
        (business_id, user_id, user_label, action, entity_type, entity_id, entity_label, summary, detail_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      businessId || null,
      userId || null,
      userLabel || 'Admin',
      action,
      entityType,
      entityId || null,
      entityLabel || null,
      summary,
      detailJson ? JSON.stringify(detailJson) : null
    );
  } catch (err) {
    // Audit logging should never break the primary operation
    console.error('[AuditLogger] Failed to write audit log:', err.message);
  }
}

module.exports = { logAudit };
