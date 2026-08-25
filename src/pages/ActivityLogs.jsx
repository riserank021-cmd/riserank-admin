import { useState, useEffect, useCallback } from 'react';
import { analyticsAPI } from '../api/client';
import { useToast } from '../components/Toast';

// Super Admin only — GET /analytics/admin-logs is gated by
// authorize(ROLES.SUPER_ADMIN) only (not extended to plain Admin on the
// backend), so this page is only reachable/linked for that role — see
// Layout.jsx's SUPER_ADMIN_TAIL_NAV. Field names below are the real
// ActivityLog schema fields verbatim (actor/actorModel/actorRole/action/
// targetModel/targetId/coachingCenter/ipAddress/userAgent/endpoint/method/
// statusCode/metadata/createdAt) — see models/ActivityLog.js.
export default function ActivityLogs() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [error, setError] = useState('');

  const LIMIT = 50;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: LIMIT };
      if (actionFilter) params.action = actionFilter;
      const { data } = await analyticsAPI.adminLogs(params);
      setItems(data.data ?? []);
      setTotal(data.pagination?.total ?? 0);
    } catch (err) {
      if (err?.response?.status === 403) setError("You don't have permission to perform this action.");
      else toast('Failed to load activity logs', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / LIMIT);

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Activity Logs</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString()} total</p>
        </div>
        <input
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Filter by action (e.g. admin.update)…"
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No activity logs found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actor</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Target</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Coaching Center</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((log) => (
                <tr key={log._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{log.actor?.name ?? '—'}</div>
                    <div className="text-xs text-gray-400">{log.actor?.email ?? ''}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{(log.actorRole ?? '').replace('_', ' ')}</td>
                  <td className="px-4 py-3"><code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{log.action}</code></td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {log.targetModel ? `${log.targetModel}${log.targetId ? ` #${String(log.targetId).slice(-6)}` : ''}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{log.coachingCenter ? String(log.coachingCenter).slice(-6) : '—'}</td>
                  <td className="px-4 py-3 text-xs">
                    {log.statusCode
                      ? <span className={log.statusCode < 400 ? 'text-green-600' : 'text-red-600'}>{log.statusCode}</span>
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {log.createdAt ? new Date(log.createdAt).toLocaleString('en-IN') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">← Prev</button>
            <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
