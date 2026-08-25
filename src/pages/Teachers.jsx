/**
 * Teachers.jsx — Teacher Management.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { teachersAPI, examsAPI, coachingCentersAPI, uploadAPI } from '../api/client';
import { Modal, ConfirmModal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { useAuth } from '../hooks/useAuth';

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
  exams: [],
  coachingCenter: '',
};

const input = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';
const label = 'block text-xs font-semibold text-gray-600 mb-1';

function TeacherForm({ form, setForm, onSubmit, loading, editTarget }) {
  const { isSuperAdmin, isAdminRole } = useAuth();
  const canPickCenter = isSuperAdmin || isAdminRole;
  const [exams, setExams] = useState([]);
  const [centers, setCenters] = useState([]);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const avatarFileRef = useRef(null);

  useEffect(() => {
    examsAPI.list({ limit: 100, status: 'published' }).then(({ data }) => setExams(data.data ?? [])).catch(() => {});
    if (canPickCenter) coachingCentersAPI.list({ limit: 100 }).then(({ data }) => setCenters(data.data ?? [])).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));
  const setBi = (field, lang, val) => setForm((p) => ({ ...p, [field]: { ...p[field], [lang]: val } }));
  const toggleTag = (val) => set('examTags', form.examTags.includes(val) ? form.examTags.filter((t) => t !== val) : [...form.examTags, val]);
  const toggleExam = (id) => set('exams', form.exams.includes(id) ? form.exams.filter((e) => e !== id) : [...form.exams, id]);

  const handleAvatarUpload = async (file) => {
    if (!file || !editTarget) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setAvatarError('Only JPEG, PNG, or WebP images are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Image too large — max 5MB');
      return;
    }
    setAvatarError('');
    setAvatarUploading(true);
    try {
      const { data } = await uploadAPI.teacherAvatar(editTarget._id, file);
      set('avatarUrl', data.data.url);
    } catch (err) {
      setAvatarError(err?.response?.data?.message ?? 'Upload failed');
    } finally {
      setAvatarUploading(false);
      if (avatarFileRef.current) avatarFileRef.current.value = '';
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label className={label}>Name *</label>
        <input className={input} value={form.name} onChange={(e) => set('name', e.target.value)} required />
      </div>
      <div>
        <label className={label}>Photo</label>
        <div className="flex gap-3 items-start">
          <div className="w-16 h-16 shrink-0 rounded-full border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
            {form.avatarUrl
              ? <img src={form.avatarUrl} alt="Avatar preview" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              : <span className="text-[10px] text-gray-400">No photo</span>}
          </div>
          <div className="flex-1">
            <div className="flex gap-2">
              <input className={input} value={form.avatarUrl} onChange={(e) => set('avatarUrl', e.target.value)} placeholder="https://…" />
              <input ref={avatarFileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={(e) => handleAvatarUpload(e.target.files?.[0])} />
              <button type="button" disabled={avatarUploading || !editTarget} onClick={() => avatarFileRef.current?.click()}
                className="shrink-0 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                {avatarUploading ? 'Uploading…' : '📤 Upload'}
              </button>
            </div>
            {avatarError && <p className="text-xs text-red-500 mt-1">{avatarError}</p>}
            {!editTarget && <p className="text-xs text-gray-400 mt-1">Save the teacher first, then reopen it to upload a photo.</p>}
          </div>
        </div>
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
      <div>
        <label className={label}>Exams</label>
        {exams.length === 0 ? (
          <p className="text-xs text-gray-400">No exams available yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {exams.map((ex) => (
              <button type="button" key={ex._id} onClick={() => toggleExam(ex._id)}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                  form.exams.includes(ex._id) ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-300 hover:border-primary-300'
                }`}>
                {ex.name} {form.exams.includes(ex._id) ? '✓' : ''}
              </button>
            ))}
          </div>
        )}
      </div>
      {canPickCenter && (
        <div>
          <label className={label}>Coaching Center</label>
          <select className={input} value={form.coachingCenter} onChange={(e) => set('coachingCenter', e.target.value)}>
            <option value="">Global (RiseRank's own content)</option>
            {centers.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
      )}
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
  const { admin, isCoachingAdmin, isSuperAdmin, isAdminRole } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [centers, setCenters] = useState([]);
  const [centerFilter, setCenterFilter] = useState('');
  // Preserves the pre-Phase-9 default (list only ever requested
  // isActive:true, hardcoded — archived teachers were invisible and
  // unreactivatable from the UI). Default stays 'active' so every role's
  // default view is byte-for-byte the same as before; the archive/reactivate
  // workflow this phase added is reachable by switching this filter, not by
  // changing what loads by default.
  const [statusFilter, setStatusFilter] = useState('active');

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const ownCenterId = typeof admin?.coachingCenter === 'object' ? admin?.coachingCenter?._id : admin?.coachingCenter;

  useEffect(() => {
    if (isSuperAdmin || isAdminRole) {
      coachingCentersAPI.list({ limit: 100 }).then(({ data }) => setCenters(data.data ?? [])).catch(() => {});
    }
  }, [isSuperAdmin, isAdminRole]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (search) params.search = search;
      if (statusFilter === 'active') params.isActive = true;
      else if (statusFilter === 'archived') params.isActive = false;
      // 'all' omits the param entirely
      if (isCoachingAdmin && ownCenterId) params.coachingCenter = ownCenterId;
      else if (centerFilter) params.coachingCenter = centerFilter;
      const { data } = await teachersAPI.list(params);
      setItems(data.data ?? []);
    } catch (err) {
      if (err?.response?.status === 403) toast("You don't have permission to perform this action.", 'error');
      else toast('Failed to load teachers', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, isCoachingAdmin, ownCenterId, centerFilter]); // eslint-disable-line react-hooks/exhaustive-deps

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
      exams: (t.exams ?? []).map((ex) => ex._id ?? ex),
      coachingCenter: (typeof t.coachingCenter === 'object' ? t.coachingCenter?._id : t.coachingCenter) ?? '',
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
      if (isCoachingAdmin) delete payload.coachingCenter;
      else if (!payload.coachingCenter) payload.coachingCenter = null;
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
      const status = err?.response?.status;
      if (status === 403) toast("You don't have permission to perform this action.", 'error');
      else toast(err?.response?.data?.message ?? 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (t) => {
    try {
      await teachersAPI.update(t._id, { isActive: !t.isActive });
      toast(t.isActive ? 'Teacher archived' : 'Teacher reactivated');
      load();
    } catch (err) {
      toast(err?.response?.data?.message ?? 'Action failed', 'error');
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

      <div className="flex flex-wrap gap-2 mb-5">
        <input
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-64"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-600">
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="all">All</option>
        </select>
        {(isSuperAdmin || isAdminRole) && centers.length > 0 && (
          <select value={centerFilter} onChange={(e) => setCenterFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-600">
            <option value="">All Coaching Centers</option>
            {centers.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        )}
      </div>

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
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-gray-900 truncate">{t.name}</p>
                    {!t.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 flex-shrink-0">Archived</span>}
                  </div>
                  <p className="text-xs text-gray-400">{(t.subjects ?? []).join(', ') || 'No subjects set'}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 line-clamp-2 mb-1">{t.bio?.en || 'No bio yet'}</p>
              <p className="text-xs text-gray-400 mb-3">
                {t.coachingCenter
                  ? `Coaching Center: ${centers.find((c) => c._id === (t.coachingCenter?._id ?? t.coachingCenter))?.name ?? 'Coaching Center'}`
                  : 'Global'}
              </p>
              <div className="flex gap-2">
                <button onClick={() => openEdit(t)} className="flex-1 text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg text-primary-600 hover:bg-primary-50">
                  ✏️ Edit
                </button>
                <button onClick={() => handleToggleActive(t)} className="text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                  {t.isActive ? '📦 Archive' : '♻️ Reactivate'}
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
        <TeacherForm form={form} setForm={setForm} onSubmit={handleSubmit} loading={saving} editTarget={editTarget} />
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
