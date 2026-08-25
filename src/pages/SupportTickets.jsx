/**
 * SupportTickets.jsx — admin queue for the app's in-app "Contact Support"
 * form (replaces the old mailto-only stub).
 */

import { useState, useEffect, useCallback } from 'react';
import { supportTicketsAPI } from '../api/client';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';

const STATUS_LABELS = { open: 'Open', in_progress: 'In Progress', resolved: 'Resolved' };
const STATUS_COLORS = {
  open: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
};

function TicketModal({ ticket, open, onClose, onRespond }) {
  const [status, setStatus] = useState('in_progress');
  const [adminNote, setAdminNote] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onRespond(ticket._id, { status, adminNote });
      toast('Ticket updated');
      onClose();
    } catch {
      toast('Update failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Support Ticket" size="md">
      {ticket && (
        <div className="space-y-4">
          <div>
            <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">From</div>
            <p className="text-sm text-gray-700">{ticket.user?.name ?? '—'}</p>
            <p className="text-xs text-gray-400">{ticket.user?.email ?? ''}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">{ticket.subject}</div>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{ticket.message}</p>
          </div>
          <div className="text-xs text-gray-400">
            Submitted {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString('en-IN') : ''}
          </div>
          <form onSubmit={handleSubmit} className="space-y-3 pt-3 border-t">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
              placeholder="Internal note (not visible to the user)…"
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
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </Modal>
  );
}

export default function SupportTickets() {
  const toast = useToast();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('open');
  const [selected, setSelected] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = filterStatus ? { status: filterStatus } : {};
    supportTicketsAPI.list(params)
      .then(({ data }) => setTickets(data.data ?? []))
      .catch(() => toast('Failed to load tickets', 'error'))
      .finally(() => setLoading(false));
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  const handleRespond = async (id, payload) => {
    await supportTicketsAPI.respond(id, payload);
    load();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">🎫 Support Tickets</h1>
          <p className="text-sm text-gray-500 mt-0.5">In-app support requests from students</p>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        {['open', 'in_progress', 'resolved', ''].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === s ? 'bg-primary-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s === '' ? 'All' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : tickets.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No tickets found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Subject</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-40">From</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Date</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tickets.map((t) => (
                <tr key={t._id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(t)}>
                  <td className="px-4 py-3 text-gray-700"><div className="truncate max-w-sm">{t.subject}</div></td>
                  <td className="px-4 py-3 text-gray-500 truncate">{t.user?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-IN') : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[t.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[t.status] ?? t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <TicketModal ticket={selected} open={!!selected} onClose={() => setSelected(null)} onRespond={handleRespond} />
    </div>
  );
}
