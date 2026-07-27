/**
 * Teachers.jsx — Teacher Management.
 */

import { useState, useEffect, useCallback } from 'react';
import { teachersAPI } from '../api/client';
import { Modal, ConfirmModal } from '../components/Modal';
import { useToast } from '../components/Toast';

const EXAM_CATEGORIES = [
  { value: 'ssc',      label: 'SSC' },
  { value: 'railway',  label: 'Railway' },
  { value: 'banking',  label: 'Banking' },
  { value: 'bihar_si', label: 'Bihar SI' },
];

const EMPTY_FORM = {
  name: '',
  bio: { en: '', hi: '' },
  avatarUrl: '',
  subjects: '',   // comma-separated in the UI, split to array on submit
  examTags: [],
};

const input = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';
const label = 'block text-xs font-semibold text-gray-600 mb-1';

function TeacherForm({ form, setForm, onSubmit, loading }) {
  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));
  const setBi = (field, lang, val) => setForm((p) => ({ ...p, [field]: { ...p[field], [lang]: val } }));
  const toggleTag = (val) => set('examTags', form.examTags.includes(val) ? form.examTags.filter((t) => t !== val) : [...form.examTags, val]);

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label className={label}>Name *</label>
        <input className={input} value={form.name} onChange={(e) => set('name', e.target.value)} required />
      </div>
      <div>
        <label className={label}>Avatar URL</label>
        <input className={input} value={form.avatarUrl} onChange={(e) => set('avatarUrl', e.target.value)} placeholder="https://…" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Bio (English)</label>
          <textarea className={`${input} resize-none`} rows={3} value={form.bio.en} onChange={(e) => setBi('bio', 'en', e.target.value)} />
        </div>
        <div>
          <label className={label}>Bio (Hindi)</label>
          <textarea className={`${input} resize-none`} rows={3} value={form.bio.hi} onChange={(e) => setBi('bio', 'hi', e.target.value)} />
        </div>
      </div>
      <div>
        <label className={label}>Subjects (comma-separated)</label>
        <input className={input} value={form.subjects} onChange={(e) => set('subjects', e.target.value)} placeholder="Maths, Reasoning" />
      </div>
      <div>
        <label className={label}>Exam Tags</label>
        <div className="flex flex-wrap gap-3 mt-1">
          {EXAM_CATEGORIES.map((c) => (
            <label key={c.value} className="flex items-center gap-1.5 text-xs text-gray-700">
              <input type="checkbox" checked={form.examTags.includes(c.value)} onChange={() => toggleTag(c.value)} className="accent-primary-600" />
              {c.label}
            </label>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <button type="submit" disabled={loading} className="px-6 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50">
          {loading ? 'Saving…' : 'Save Teacher'}
        </button>
      </div>
    </form>
  );
}

export default function Teachers() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 100, isActive: true };
      if (search) params.search = search;
      const { data } = await teachersAPI.list(params);
      setItems(data.data ?? []);
    } catch {
      toast('Failed to load teachers', 'error');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (t) => {
    setEditTarget(t);
    setForm({
      name: t.name,
      bio: t.bio ?? { en: '', hi: '' },
      avatarUrl: t.avatarUrl ?? '',
      subjects: (t.subjects ?? []).join(', '),
      examTags: t.examTags ?? [],
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        subjects: form.subjects.split(',').map((s) => s.trim()).filter(Boolean),
      };
      if (editTarget) {
        await teachersAPI.update(editTarget._id, payload);
        toast('Teacher updated');
      } else {
        await teachersAPI.create(payload);
        toast('Teacher created');
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
      await teachersAPI.remove(deleteTarget._id);
      toast('Teacher deleted');
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
          <h1 className="text-2xl font-bold text-gray-900">🧑‍🏫 Teachers</h1>
          <p className="text-sm text-gray-500 mt-0.5">Instructors attributed on Video Classes</p>
        </div>
        <button onClick={openCreate} className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700">
          + New Teacher
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
          <p className="text-4xl mb-3">🧑‍🏫</p>
          <p className="text-gray-500 font-medium">No teachers yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((t) => (
            <div key={t._id} className="border border-gray-200 rounded-xl p-4 bg-white">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-sm font-bold text-primary-700 flex-shrink-0 overflow-hidden">
                  {t.avatarUrl ? <img src={t.avatarUrl} alt={t.name} className="w-full h-full object-cover" /> : t.name?.[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{t.name}</p>
                  <p className="text-xs text-gray-400">{(t.subjects ?? []).join(', ') || 'No subjects set'}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 line-clamp-2 mb-3">{t.bio?.en || 'No bio yet'}</p>
              <div className="flex gap-2">
                <button onClick={() => openEdit(t)} className="flex-1 text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg text-primary-600 hover:bg-primary-50">
                  ✏️ Edit
                </button>
                <button onClick={() => setDeleteTarget(t)} className="text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg text-red-500 hover:bg-red-50">
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? `Edit: ${editTarget.name}` : 'Create Teacher'} size="md">
        <TeacherForm form={form} setForm={setForm} onSubmit={handleSubmit} loading={saving} />
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Teacher"
        message={`Delete "${deleteTarget?.name}"? Videos already attributed to them will keep the reference.`}
        danger
      />
    </div>
  );
}
