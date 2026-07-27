/**
 * Batches.jsx — Batch Management.
 * Batches are the reusable student groups that gate access to
 * accessType='batch' videos (and, per the earlier Current Affairs
 * discussion, could gate other content later without a redesign).
 */

import { useState, useEffect, useCallback } from 'react';
import { batchesAPI, usersAPI } from '../api/client';
import { Modal, ConfirmModal } from '../components/Modal';
import { useToast } from '../components/Toast';

const EXAM_CATEGORIES = [
  { value: 'ssc',      label: 'SSC' },
  { value: 'railway',  label: 'Railway' },
  { value: 'banking',  label: 'Banking' },
  { value: 'bihar_si', label: 'Bihar SI' },
];

const EMPTY_FORM = { name: '', description: '', examCategory: '' };
const input = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';
const label = 'block text-xs font-semibold text-gray-600 mb-1';

function BatchForm({ form, setForm, onSubmit, loading }) {
  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className={label}>Name *</label>
        <input className={input} value={form.name} onChange={(e) => set('name', e.target.value)} required placeholder="e.g. SSC CGL 2026 — Batch A" />
      </div>
      <div>
        <label className={label}>Description</label>
        <textarea className={`${input} resize-none`} rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />
      </div>
      <div>
        <label className={label}>Exam Category (optional filter hint)</label>
        <select className={input} value={form.examCategory} onChange={(e) => set('examCategory', e.target.value)}>
          <option value="">— None —</option>
          {EXAM_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>
      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <button type="submit" disabled={loading} className="px-6 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50">
          {loading ? 'Saving…' : 'Save Batch'}
        </button>
      </div>
    </form>
  );
}

// ── Manage Students modal ───────────────────────────────────────────────────
function ManageStudents({ batch, onClose }) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [searching, setSearching] = useState(false);

  const loadMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const { data } = await batchesAPI.listStudents(batch._id, { limit: 100 });
      setMembers(data.data ?? []);
    } catch {
      toast('Failed to load students', 'error');
    } finally {
      setLoadingMembers(false);
    }
  }, [batch._id]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const doSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const { data } = await usersAPI.list({ search: search.trim(), limit: 15 });
      setResults(data.data?.users ?? data.data ?? []);
    } catch {
      /* ignore */
    } finally {
      setSearching(false);
    }
  };

  const isMember = (id) => members.some((m) => m._id === id);

  const addStudent = async (user) => {
    try {
      await batchesAPI.addStudents(batch._id, [user._id]);
      setMembers((m) => [...m, user]);
      toast(`${user.name} added to batch`);
    } catch (err) {
      toast(err?.response?.data?.message ?? 'Failed to add', 'error');
    }
  };

  const removeStudent = async (user) => {
    try {
      await batchesAPI.removeStudents(batch._id, [user._id]);
      setMembers((m) => m.filter((x) => x._id !== user._id));
      toast(`${user.name} removed from batch`);
    } catch (err) {
      toast(err?.response?.data?.message ?? 'Failed to remove', 'error');
    }
  };

  return (
    <Modal open onClose={onClose} title={`Manage Students — ${batch.name}`} size="lg">
      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            className={`${input} flex-1`}
            placeholder="Search students by name, email, or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doSearch()}
          />
          <button type="button" onClick={doSearch} className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700">
            {searching ? '…' : 'Search'}
          </button>
        </div>

        {results.length > 0 && (
          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
            {results.map((u) => (
              <div key={u._id} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm text-gray-800 truncate">{u.name}</p>
                  <p className="text-xs text-gray-400 truncate">{u.email}</p>
                </div>
                <button
                  onClick={() => (isMember(u._id) ? removeStudent(u) : addStudent(u))}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0 ${
                    isMember(u._id) ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-primary-50 text-primary-700 hover:bg-primary-100'
                  }`}
                >
                  {isMember(u._id) ? '✕ Remove' : '+ Add'}
                </button>
              </div>
            ))}
          </div>
        )}

        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1.5">{members.length} student{members.length !== 1 ? 's' : ''} in this batch</p>
          {loadingMembers ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-gray-400">No students yet — search above to add some.</p>
          ) : (
            <div className="border border-green-200 bg-green-50 rounded-lg divide-y divide-green-100 max-h-56 overflow-y-auto">
              {members.map((u) => (
                <div key={u._id} className="flex items-center justify-between px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-700 truncate">{u.name}</p>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                  </div>
                  <button onClick={() => removeStudent(u)} className="text-xs text-red-500 hover:text-red-700 flex-shrink-0">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default function Batches() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [manageTarget, setManageTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (search) params.search = search;
      const { data } = await batchesAPI.list(params);
      setItems(data.data ?? []);
    } catch {
      toast('Failed to load batches', 'error');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (b) => {
    setEditTarget(b);
    setForm({ name: b.name, description: b.description ?? '', examCategory: b.examCategory ?? '' });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.examCategory) delete payload.examCategory;
      if (editTarget) {
        await batchesAPI.update(editTarget._id, payload);
        toast('Batch updated');
      } else {
        await batchesAPI.create(payload);
        toast('Batch created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast(err?.response?.data?.message ?? 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await batchesAPI.remove(deleteTarget._id);
      toast('Batch deleted');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast(err?.response?.data?.message ?? 'Delete failed', 'error');
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">👥 Batches</h1>
          <p className="text-sm text-gray-500 mt-0.5">Reusable student groups used to restrict video access</p>
        </div>
        <button onClick={openCreate} className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700">
          + New Batch
        </button>
      </div>

      <input
        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-64 mb-5"
        placeholder="Search by name…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">👥</p>
          <p className="text-gray-500 font-medium">No batches yet</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Students</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((b) => (
                <tr key={b._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{b.name}</p>
                    {b.description && <p className="text-xs text-gray-400 line-clamp-1">{b.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 uppercase">{b.examCategory ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600 font-semibold">{b.studentCount ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => setManageTarget(b)} className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg text-primary-600 hover:bg-primary-50">
                        👥 Students
                      </button>
                      <button onClick={() => openEdit(b)} className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                        ✏️ Edit
                      </button>
                      <button onClick={() => setDeleteTarget(b)} className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg text-red-500 hover:bg-red-50">
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? `Edit: ${editTarget.name}` : 'Create Batch'} size="md">
        <BatchForm form={form} setForm={setForm} onSubmit={handleSubmit} loading={saving} />
      </Modal>

      {manageTarget && <ManageStudents batch={manageTarget} onClose={() => { setManageTarget(null); load(); }} />}

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Batch"
        message={`Delete "${deleteTarget?.name}"? Any videos restricted to this batch will lose that access grant.`}
        danger
      />
    </div>
  );
}
