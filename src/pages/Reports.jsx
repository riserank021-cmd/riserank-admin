import { useState, useEffect, useCallback } from 'react';
import { reportsAPI } from '../api/client';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';

// Must match Report.js's REPORT_REASONS enum exactly, or unmapped reasons
// silently fall back to the raw enum value below.
const REASON_LABELS = {
  wrong_answer: 'Wrong Answer',
  unclear_question: 'Unclear Question',
  typo_or_grammar: 'Typo / Grammar',
  wrong_translation: 'Wrong Translation',
  outdated_content: 'Outdated Content',
  other: 'Other',
};

// Must match Report.js's REPORT_STATUS enum ('rejected', not 'dismissed') —
// sending 'dismissed' fails Joi validation server-side (admin.validator.js),
// so the old "Dismiss" button here always errored. Label stays "Dismiss" for
// the admin; the value sent to the API is 'rejected'.
const STATUS_LABELS = {
  pending: 'Pending',
  reviewed: 'Reviewed',
  resolved: 'Resolved',
  rejected: 'Dismissed',
};

function StatusBadge({ status }) {
  const map = {
    pending: 'bg-yellow-100 text-yellow-700',
    reviewed: 'bg-blue-100 text-blue-700',
    resolved: 'bg-green-100 text-green-700',
    rejected: 'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function ReportDetailModal({ report, open, onClose, onReview }) {
  const [action, setAction] = useState('resolved');
  const [adminNote, setAdminNote] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onReview(report._id, { status: action, reviewNote: adminNote });
      toast('Report updated');
      onClose();
    } catch {
      toast('Update failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const q = report?.question;

  return (
    <Modal open={open} onClose={onClose} title="Review Report" size="md">
      {report && (
        <div className="space-y-4">
          {/* Question Info */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Question</div>
            <p className="text-sm text-gray-800 font-medium">{q?.questionText?.en ?? q?.text?.en ?? 'Question removed'}</p>
            {(q?.questionText?.hi ?? q?.text?.hi) && <p className="text-xs text-gray-500 mt-1">{q.questionText?.hi ?? q.text?.hi}</p>}
          </div>

          {/* Reporter + Reason */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Reported by</div>
              <p className="text-gray-700">{report.user?.name ?? '—'}</p>
              <p className="text-xs text-gray-400">{report.user?.email ?? ''}</p>
            </div>
            <div>
              <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Reason</div>
              <p className="text-gray-700">{REASON_LABELS[report.reason] ?? report.reason}</p>
            </div>
          </div>

          {report.description && (
            <div>
              <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Note</div>
              <p className="text-sm text-gray-700 bg-amber-50 rounded-lg p-3">{report.description}</p>
            </div>
          )}

          <div className="text-xs text-gray-400">
            Reported {report.createdAt ? new Date(report.createdAt).toLocaleString('en-IN') : ''}
          </div>

          {/* Review form */}
          {report.status === 'pending' && (
            <form onSubmit={handleSubmit} className="space-y-3 pt-3 border-t">
              <div className="flex gap-3">
                {['resolved', 'rejected'].map((s) => (
                  <label key={s} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="action"
                      value={s}
                      checked={action === s}
                      onChange={() => setAction(s)}
                      className="accent-primary-600"
                    />
                    {STATUS_LABELS[s]}
                  </label>
                ))}
              </div>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={2}
                placeholder="Admin note (optional)…"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
              />
              <div className="flex justify-end gap-3">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-lg transition-colors"
                >
                  {saving ? 'Saving…' : 'Submit Review'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </Modal>
  );
}

export default function Reports() {
  const toast = useToast();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterStatus, setFilterStatus] = useState('pending');

  const [selected, setSelected] = useState(null);

  // Pending reports grouped by question — lets an admin resolve every report
  // against one bad question in a single click instead of clicking through
  // each duplicate report one at a time.
  const [groups, setGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [bulkActingOn, setBulkActingOn] = useState(null); // questionId while a bulk action is in flight

  const LIMIT = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (filterStatus) params.status = filterStatus;
      const { data } = await reportsAPI.list(params);
      setReports(data.data?.reports ?? data.data ?? []);
      setTotal(data.data?.total ?? data.total ?? data.pagination?.total ?? 0);
    } catch {
      toast('Failed to load reports', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus]);

  const loadGroups = useCallback(async () => {
    setGroupsLoading(true);
    try {
      const { data } = await reportsAPI.grouped();
      setGroups(data.data ?? []);
    } catch {
      toast('Failed to load grouped reports', 'error');
    } finally {
      setGroupsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadGroups(); }, [loadGroups]);

  const handleReview = async (id, payload) => {
    await reportsAPI.review(id, payload);
    load();
    loadGroups();
  };

  const bulkReview = async (questionId, status) => {
    setBulkActingOn(questionId);
    try {
      const { data } = await reportsAPI.bulkReview(questionId, { status });
      toast(`${data.data?.modified ?? 0} report(s) ${status === 'resolved' ? 'resolved' : 'dismissed'}`);
      setGroups((prev) => prev.filter((g) => g.questionId !== questionId));
      if (filterStatus === 'pending') load();
    } catch {
      toast('Bulk action failed', 'error');
    } finally {
      setBulkActingOn(null);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString()} {filterStatus ? STATUS_LABELS[filterStatus]?.toLowerCase() ?? filterStatus : 'total'}</p>
        </div>
      </div>

      {/* Grouped bulk-resolve queue — always visible since it only ever holds pending reports */}
      {!groupsLoading && groups.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">🚩 Flagged questions ({groups.length})</h2>
          <div className="space-y-2">
            {groups.map((g) => {
              const busy = bulkActingOn === g.questionId;
              return (
                <div key={g.questionId} className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl">
                  <div className="min-w-0 pr-4">
                    <p className="text-sm text-gray-800 truncate">{g.question?.questionText?.en ?? '(question removed)'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {g.reportCount} report{g.reportCount === 1 ? '' : 's'} · {g.reasons?.map((r) => REASON_LABELS[r] ?? r).join(', ')}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      disabled={busy}
                      onClick={() => bulkReview(g.questionId, 'rejected')}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Dismiss all
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => bulkReview(g.questionId, 'resolved')}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
                    >
                      {busy ? 'Saving…' : `Resolve all ${g.reportCount}`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-3 mb-4">
        {['pending', 'resolved', 'rejected', ''].map((s) => (
          <button
            key={s}
            onClick={() => { setFilterStatus(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === s
                ? 'bg-primary-600 text-white'
                : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s === '' ? 'All' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : reports.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No reports found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Question</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Reason</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Reporter</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Date</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20 text-right">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reports.map((r) => (
                <tr key={r._id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(r)}>
                  <td className="px-4 py-3 text-gray-700">
                    <div className="truncate max-w-xs">{r.question?.questionText?.en ?? r.question?.text?.en ?? '(deleted)'}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{REASON_LABELS[r.reason] ?? r.reason}</td>
                  <td className="px-4 py-3 text-gray-500 truncate">{r.user?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelected(r); }}
                      className="px-3 py-1 text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
                    >
                      View
                    </button>
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

      <ReportDetailModal
        report={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onReview={handleReview}
      />
    </div>
  );
}
