'use client';

import { useEffect, useState, useCallback } from 'react';
import { FileCheck, Check, X, Clock, Loader2 } from 'lucide-react';
import { useSocketEvent } from '@/providers/SocketProvider';

const API_BASE = '/api';

export default function ApprovalsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [notes, setNotes] = useState({});

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/approval/all`, { credentials: 'include', cache: 'no-store' });
      const data = await res.json();
      if (data.success) setRequests(data.data);
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // Real-time: refresh when new requests come in
  useSocketEvent('approvals:new', fetchRequests);
  useSocketEvent('approvals:approved', fetchRequests);
  useSocketEvent('approvals:rejected', fetchRequests);

  const handleAction = async (id, action, notes = '') => {
    setActionLoading(id);
    try {
      const res = await fetch(`${API_BASE}/approval/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notes }),
      });
      const data = await res.json();
      if (data.success) fetchRequests();
    } catch (err) {
      console.error(`Failed to ${action}:`, err);
    } finally {
      setActionLoading(null);
    }
  };

  const statusBadge = (status) => {
    const styles = {
      pending: 'bg-amber-100 text-amber-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-slate-100 text-slate-700'}`}>
        {status === 'pending' && <Clock className="h-3 w-3" />}
        {status === 'approved' && <Check className="h-3 w-3" />}
        {status === 'rejected' && <X className="h-3 w-3" />}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Business Approvals</h1>
        <p className="text-slate-500 mt-1">Review and manage business registration requests</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-100 text-center">
          <FileCheck className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No business requests yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-slate-900">{req.business_name}</h3>
                    {statusBadge(req.status)}
                  </div>
                  <div className="text-sm text-slate-500 space-y-1">
                    <p>Type: <span className="text-slate-700">{req.business_type}</span></p>
                    <p>Owner: <span className="text-slate-700">{req.admin_name}</span> ({req.admin_email})</p>
                    {req.description && <p>Description: <span className="text-slate-700">{req.description}</span></p>}
                    {req.address && <p>Address: <span className="text-slate-700">{req.address}</span></p>}
                    <p>Submitted: <span className="text-slate-700">{new Date(req.created_at).toLocaleDateString()}</span></p>
                  </div>
                </div>
                {req.status === 'pending' && (
                  <div className="flex flex-col gap-2 ml-4 min-w-[220px]">
                    <textarea
                      value={notes[req.id] || ''}
                      onChange={(e) => setNotes({ ...notes, [req.id]: e.target.value })}
                      placeholder="Add a note (reason)..."
                      rows={2}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(req.id, 'approve', notes[req.id] || '')}
                        disabled={actionLoading === req.id}
                        className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                      >
                        {actionLoading === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction(req.id, 'reject', notes[req.id] || '')}
                        disabled={actionLoading === req.id}
                        className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                      >
                        <X className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {req.review_notes && (
                <div className="mt-4 p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
                  <span className="font-medium">Review notes:</span> {req.review_notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
