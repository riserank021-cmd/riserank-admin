import { useState, useEffect, useCallback, useRef } from 'react';
import { coachingCentersAPI } from '../api/client';
import { Modal, ConfirmModal } from '../components/Modal';
import { useToast } from '../components/Toast';

// Super Admin / Admin only — Coaching Center entities themselves (profile,
// logo/cover, status) are managed here. Content ownership (videos/playlists/
// teachers/quizzes/exams) is handled in each of those pages, not here — see
// coachingCenter.routes.js's own comment on this split.
const STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];

const EMPTY_FORM = {
  name: '', slug: '', description: '', location: '',
  contactEmail: '', contactPhone: '', website: '', status: 'ACTIVE',
};

const STATUS_BADGE = {
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-gray-100 text-gray-500',
  SUSPENDED: 'bg-red-100 text-red-700',
};

const input = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';
const label = 'block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5';

function ImageUploadField({ title, currentUrl, onUpload, uploading, error }) {
  const fileRef = useRef(null);
  const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
  const MAX_SIZE = 5 * 1024 * 1024;

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED.includes(file.type)) {
      onUpload(null, 'Only JPEG, PNG or WebP images are allowed');
      return;
    }
    if (file.size > MAX_SIZE) {
      onUpload(null, 'Image must be under 5MB');
      return;
    }
    onUpload(file, null);
    e.target.value = '';
  };

  return (
    <div>
      <label className={label}>{title}</label>
      <div className="flex items-center gap-3">
        <div className="w-20 h-20 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center flex-shrink-0">
          {currentUrl
            ? <img src={currentUrl} alt={title} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
            : <span className="text-xs text-gray-400">No image</span>}
        </div>
        <div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            {uploading ? 'Uploading…' : currentUrl ? 'Replace' : 'Upload'}
          </button>
          {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
        </div>
      </div>
    </div>
  );
}

function CenterForm({ form, setForm, onSubmit, loading, editTarget, onLogoUpload, onCoverUpload, logoState, coverState }) {
  const setField = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className={label}>Name *</label>
        <input required className={input} value={form.name} onChange={(e) => setField('name', e.target.value)} />
      </div>
      <div>
        <label className={label}>Slug</label>
        <input className={input} value={form.slug} onChange={(e) => setField('slug', e.target.value)} placeholder="Auto-derived from name if left blank" />
      </div>
      <div>
        <label className={label}>Description</label>
        <textarea rows={3} className={input} value={form.description} onChange={(e) => setField('description', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Location</label>
          <input className={input} value={form.location} onChange={(e) => setField('location', e.target.value)} />
        </div>
        <div>
          <label className={label}>Website</label>
          <input type="url" className={input} value={form.website} onChange={(e) => setField('website', e.target.value)} placeholder="https://…" />
        </div>
        <div>
          <label className={label}>Contact Email</label>
          <input type="email" className={input} value={form.contactEmail} onChange={(e) => setField('contactEmail', e.target.value)} />
        </div>
        <div>
          <label className={label}>Contact Phone</label>
          <input className={input} value={form.contactPhone} onChange={(e) => setField('contactPhone', e.target.value)} />
        </div>
      </div>
      <div>
        <label className={label}>Status</label>
        <select className={input} value={form.status} onChange={(e) => setField('status', e.target.value)}>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {editTarget ? (
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <ImageUploadField title="Logo" currentUrl={editTarget.logo} onUpload={onLogoUpload} uploading={logoState.uploading} error={logoState.error} />
          <ImageUploadField title="Cover Image" currentUrl={editTarget.coverImage} onUpload={onCoverUpload} uploading={coverState.uploading} error={coverState.error} />
        </div>
      ) : (
        <p className="text-xs text-gray-400 pt-2 border-t">Save the center first, then reopen it to upload a logo/cover image.</p>
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

export default function CoachingCenters() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [logoState, setLogoState] = useState({ uploading: false, error: null });
  const [coverState, setCoverState] = useState({ uploading: false, error: null });

  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;
      const { data } = await coachingCentersAPI.list(params);
      setItems(data.data ?? []);
      setTotal(data.pagination?.total ?? 0);
    } catch (err) {
      if (err?.response?.status === 403) toast("You don't have permission to perform this action.", 'error');
      else toast('Failed to load coaching centers', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setLogoState({ uploading: false, error: null });
    setCoverState({ uploading: false, error: null });
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditTarget(item);
    setForm({
      name: item.name ?? '',
      slug: item.slug ?? '',
      description: item.description ?? '',
      location: item.location ?? '',
      contactEmail: item.contactEmail ?? '',
      contactPhone: item.contactPhone ?? '',
      website: item.website ?? '',
      status: item.status ?? 'ACTIVE',
    });
    setLogoState({ uploading: false, error: null });
    setCoverState({ uploading: false, error: null });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form };
    if (!payload.slug) delete payload.slug;
    try {
      if (editTarget) {
        await coachingCentersAPI.update(editTarget._id, payload);
        toast('Coaching center updated');
      } else {
        await coachingCentersAPI.create(payload);
        toast('Coaching center created');
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

  const handleLogoUpload = async (file, err) => {
    if (err) { setLogoState({ uploading: false, error: err }); return; }
    setLogoState({ uploading: true, error: null });
    try {
      const { data } = await coachingCentersAPI.uploadLogo(editTarget._id, file);
      const url = data.data.url;
      setEditTarget((p) => ({ ...p, logo: url }));
      toast('Logo uploaded');
      load();
    } catch (e2) {
      setLogoState({ uploading: false, error: e2?.response?.data?.message ?? 'Upload failed' });
      return;
    }
    setLogoState({ uploading: false, error: null });
  };

  const handleCoverUpload = async (file, err) => {
    if (err) { setCoverState({ uploading: false, error: err }); return; }
    setCoverState({ uploading: true, error: null });
    try {
      const { data } = await coachingCentersAPI.uploadCover(editTarget._id, file);
      const url = data.data.url;
      setEditTarget((p) => ({ ...p, coverImage: url }));
      toast('Cover image uploaded');
      load();
    } catch (e2) {
      setCoverState({ uploading: false, error: e2?.response?.data?.message ?? 'Upload failed' });
      return;
    }
    setCoverState({ uploading: false, error: null });
  };

  const [statusTarget, setStatusTarget] = useState(null); // { item, newStatus }
  const [statusSaving, setStatusSaving] = useState(false);

  const handleStatusChange = async () => {
    if (!statusTarget) return;
    setStatusSaving(true);
    try {
      await coachingCentersAPI.setStatus(statusTarget.item._id, statusTarget.newStatus);
      toast(`Status changed to ${statusTarget.newStatus}`);
      setStatusTarget(null);
      load();
    } catch (err) {
      toast(err?.response?.data?.message ?? 'Status change failed', 'error');
    } finally {
      setStatusSaving(false);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Coaching Centers</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString()} total</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition-colors">
          <span>+</span> New Coaching Center
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <input
          className="flex-1 max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">All Status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-sm bg-white rounded-xl border border-gray-200">No coaching centers found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((c) => (
            <div key={c._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="h-24 bg-gray-100 flex items-center justify-center">
                {c.coverImage
                  ? <img src={c.coverImage} alt="" className="w-full h-full object-cover" />
                  : <span className="text-3xl">🏫</span>}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 text-sm truncate">{c.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${STATUS_BADGE[c.status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {c.status}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-3">{c.location || 'No location set'}</p>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => openEdit(c)} className="px-2.5 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-50">Edit</button>
                  {c.status !== 'ACTIVE' && (
                    <button onClick={() => setStatusTarget({ item: c, newStatus: 'ACTIVE' })} className="px-2.5 py-1 text-xs border border-green-300 text-green-700 rounded-lg hover:bg-green-50">Activate</button>
                  )}
                  {c.status !== 'INACTIVE' && (
                    <button onClick={() => setStatusTarget({ item: c, newStatus: 'INACTIVE' })} className="px-2.5 py-1 text-xs border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50">Deactivate</button>
                  )}
                  {c.status !== 'SUSPENDED' && (
                    <button onClick={() => setStatusTarget({ item: c, newStatus: 'SUSPENDED' })} className="px-2.5 py-1 text-xs border border-red-300 text-red-700 rounded-lg hover:bg-red-50">Suspend</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">← Prev</button>
            <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">Next →</button>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Edit Coaching Center' : 'New Coaching Center'} size="lg">
        <CenterForm
          form={form} setForm={setForm} onSubmit={handleSubmit} loading={saving} editTarget={editTarget}
          onLogoUpload={handleLogoUpload} onCoverUpload={handleCoverUpload}
          logoState={logoState} coverState={coverState}
        />
      </Modal>

      <ConfirmModal
        open={!!statusTarget}
        onClose={() => setStatusTarget(null)}
        onConfirm={handleStatusChange}
        title={`${statusTarget?.newStatus === 'ACTIVE' ? 'Activate' : statusTarget?.newStatus === 'SUSPENDED' ? 'Suspend' : 'Deactivate'} Coaching Center`}
        message={`Set "${statusTarget?.item?.name}" status to ${statusTarget?.newStatus}?`}
        danger={statusTarget?.newStatus === 'SUSPENDED'}
        loading={statusSaving}
      />
    </div>
  );
}
