import { useState, useEffect, useCallback } from 'react';
import { examsAPI, coachingCentersAPI } from '../api/client';
import { Modal, ConfirmModal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { useAuth } from '../hooks/useAuth';

// Dynamic Exam catalog (Phase 8 backend). GLOBAL exams (coachingCenter: null)
// are managed by Admin/Super Admin only. COACHING_CENTER exams are owned by
// one center and editable by that center's own Coaching Admin plus
// Admin/Super Admin — enforced server-side via requireCoachingOwnership, the
// tab/button visibility here is UX convenience only. Coaching Admin can never
// edit a GLOBAL exam — no Edit/Archive button is ever rendered for one, and
// the backend would 403 regardless.
const input = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';
const label = 'block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5';

const EMPTY_FORM = { name: '', description: '', logo: '', status: 'published', coachingCenter: '' };

const STATUS_BADGE = {
  draft: 'bg-yellow-100 text-yellow-700',
  published: 'bg-green-100 text-green-700',
  archived: 'bg-gray-100 text-gray-500',
};

function ExamForm({ form, setForm, onSubmit, loading, canPickCenter, centers, isEdit }) {
  const setField = (key, val) => setForm((p) => ({ ...p, [key]: val }));
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className={label}>Name *</label>
        <input required className={input} value={form.name} onChange={(e) => setField('name', e.target.value)} />
      </div>
      <div>
        <label className={label}>Description</label>
        <textarea rows={3} className={input} value={form.description} onChange={(e) => setField('description', e.target.value)} />
      </div>
      <div>
        <label className={label}>Logo URL</label>
        <input type="url" className={input} value={form.logo} onChange={(e) => setField('logo', e.target.value)} placeholder="https://…" />
      </div>
      <div>
        <label className={label}>Status</label>
        <select className={input} value={form.status} onChange={(e) => setField('status', e.target.value)}>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      {canPickCenter && !isEdit && (
        <div>
          <label className={label}>Coaching Center</label>
          <select className={input} value={form.coachingCenter} onChange={(e) => setField('coachingCenter', e.target.value)}>
            <option value="">Global (all coaching centers / RiseRank)</option>
            {centers.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <p className="text-xs text-gray-400 mt-1">Leave as Global to create a platform-wide exam, or pick a center to create it on that center's behalf.</p>
        </div>
      )}
      <div className="flex justify-end gap-3 pt-2">
        <button type="submit" disabled={loading}
          className="px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
          {loading ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}

export default function Exams() {
  const toast = useToast();
  const { admin, isCoachingAdmin, isSuperAdmin, isAdminRole } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [tab, setTab] = useState('all'); // 'all' | 'global' | 'mine'
  const [search, setSearch] = useState('');
  const [centers, setCenters] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiving, setArchiving] = useState(false);

  const LIMIT = 20;
  const canManageGlobal = isSuperAdmin || isAdminRole;
  const ownCenterId = typeof admin?.coachingCenter === 'object' ? admin?.coachingCenter?._id : admin?.coachingCenter;

  useEffect(() => {
    if (canManageGlobal) {
      coachingCentersAPI.list({ limit: 100 }).then(({ data }) => setCenters(data.data ?? [])).catch(() => {});
    }
  }, [canManageGlobal]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (search) params.search = search;
      if (tab === 'global') params.scope = 'GLOBAL';
      if (tab === 'mine' && ownCenterId) params.coachingCenter = ownCenterId;
      const { data } = await examsAPI.list(params);
      setItems(data.data ?? []);
      setTotal(data.pagination?.total ?? 0);
    } catch (err) {
      if (err?.response?.status === 403) toast("You don't have permission to perform this action.", 'error');
      else toast('Failed to load exams', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, tab, ownCenterId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const canEdit = (exam) => {
    if (isSuperAdmin || isAdminRole) return true;
    if (isCoachingAdmin) return exam.coachingCenter && String(exam.coachingCenter) === String(ownCenterId);
    return false;
  };

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditTarget(item);
    setForm({
      name: item.name ?? '',
      description: item.description ?? '',
      logo: item.logo ?? '',
      status: item.status ?? 'published',
      coachingCenter: item.coachingCenter ?? '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name,
      description: form.description,
      logo: form.logo || null,
      status: form.status,
    };
    if (!editTarget && canManageGlobal) {
      payload.coachingCenter = form.coachingCenter || null;
    }
    try {
      if (editTarget) {
        await examsAPI.update(editTarget._id, payload);
        toast('Exam updated');
      } else {
        await examsAPI.create(payload);
        toast('Exam created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      const status = err?.response?.status;
      if (status === 403) toast("You don't have permission to perform this action.", 'error');
      else toast(err?.response?.data?.message ?? 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    setArchiving(true);
    try {
      await examsAPI.archive(archiveTarget._id);
      toast('Exam archived');
      setArchiveTarget(null);
      load();
    } catch (err) {
      toast(err?.response?.data?.message ?? 'Archive failed', 'error');
    } finally {
      setArchiving(false);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Exams</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString()} total</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition-colors">
          <span>+</span> New Exam
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => { setTab('all'); setPage(1); }} className={`px-4 py-2 text-sm font-semibold rounded-lg ${tab === 'all' ? 'bg-primary-600 text-white' : 'bg-white border border-gray-300 text-gray-600'}`}>All</button>
        <button onClick={() => { setTab('global'); setPage(1); }} className={`px-4 py-2 text-sm font-semibold rounded-lg ${tab === 'global' ? 'bg-primary-600 text-white' : 'bg-white border border-gray-300 text-gray-600'}`}>Global</button>
        {isCoachingAdmin && (
          <button onClick={() => { setTab('mine'); setPage(1); }} className={`px-4 py-2 text-sm font-semibold rounded-lg ${tab === 'mine' ? 'bg-primary-600 text-white' : 'bg-white border border-gray-300 text-gray-600'}`}>My Coaching Center</button>
        )}
        <input
          className="ml-auto px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Search…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No exams found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-32">Scope</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-24">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-28 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((ex) => (
                <tr key={ex._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{ex.name}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {ex.scope === 'GLOBAL' ? 'Global' : (centers.find((c) => c._id === ex.coachingCenter)?.name ?? 'Coaching Center')}
                  </td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[ex.status] ?? ''}`}>{ex.status}</span></td>
                  <td className="px-4 py-3 text-right">
                    {canEdit(ex) ? (
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(ex)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700">✏️</button>
                        {ex.status !== 'archived' && (
                          <button onClick={() => setArchiveTarget(ex)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700" title="Archive">📦</button>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300">View only</span>
                    )}
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Edit Exam' : 'New Exam'} size="md">
        <ExamForm form={form} setForm={setForm} onSubmit={handleSubmit} loading={saving} canPickCenter={canManageGlobal} centers={centers} isEdit={!!editTarget} />
      </Modal>

      <ConfirmModal
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchive}
        title="Archive Exam"
        message={`Archive "${archiveTarget?.name}"?`}
        loading={archiving}
      />
    </div>
  );
}
