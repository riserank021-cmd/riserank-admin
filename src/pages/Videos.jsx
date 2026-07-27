/**
 * Videos.jsx — Video Management.
 * CRUD for all videos (recorded + live), with search/filter/pagination.
 * Live scheduling has its own dedicated page (LiveScheduler.jsx) for the
 * countdown/quick-status workflow, but videos of either type can be
 * created/edited here too — this is the full admin view.
 */

import { useState, useEffect, useCallback } from 'react';
import { videosAPI } from '../api/client';
import { Modal, ConfirmModal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { VideoForm, EMPTY_VIDEO_FORM } from '../components/VideoForm';

const STATUS_BADGE = {
  draft:     'bg-gray-100 text-gray-600',
  published: 'bg-green-50 text-green-700',
  archived:  'bg-amber-50 text-amber-700',
};

function toDatetimeLocal(d) {
  const dt = new Date(d);
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

export default function Videos() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_VIDEO_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT }; // omitting status shows all statuses (admin-only behavior, per video.service.list)
      if (typeFilter) params.type = typeFilter;
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const { data } = await videosAPI.list(params);
      setItems(data.data ?? []);
      setTotalPages(data.pagination?.totalPages ?? 1);
    } catch {
      toast('Failed to load videos', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_VIDEO_FORM);
    setModalOpen(true);
  };

  const openEdit = (v) => {
    setEditTarget(v);
    setForm({
      title: v.title ?? { en: '', hi: '' },
      description: v.description ?? { en: '', hi: '' },
      thumbnailUrl: v.thumbnailUrl ?? '',
      type: v.type,
      youtubeVideoId: v.youtubeVideoId ?? '',
      youtubeLiveId: v.youtubeLiveId ?? '',
      durationSeconds: v.durationSeconds ?? '',
      scheduledAt: v.scheduledAt ? toDatetimeLocal(v.scheduledAt) : '',
      teacher: v.teacher?._id ?? v.teacher ?? '',
      playlist: v.playlist?._id ?? v.playlist ?? '',
      examTags: v.examTags ?? [],
      accessType: v.accessType ?? 'public',
      allowedBatches: (v.allowedBatches ?? []).map((b) => b._id ?? b),
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (payload.type === 'recorded') {
        delete payload.youtubeLiveId;
        delete payload.scheduledAt;
        if (payload.durationSeconds === '') delete payload.durationSeconds;
        else payload.durationSeconds = Number(payload.durationSeconds);
      } else {
        delete payload.youtubeVideoId;
        delete payload.durationSeconds;
        payload.scheduledAt = new Date(payload.scheduledAt).toISOString();
      }
      if (!payload.teacher) delete payload.teacher;
      if (!payload.playlist) delete payload.playlist;
      if (payload.accessType !== 'batch') delete payload.allowedBatches;

      if (editTarget) {
        await videosAPI.update(editTarget._id, payload);
        toast('Video updated');
      } else {
        await videosAPI.create(payload);
        toast('Video created as draft');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast(err?.response?.data?.message ?? 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePublishToggle = async (v) => {
    try {
      if (v.status === 'published') await videosAPI.archive(v._id);
      else await videosAPI.publish(v._id);
      toast(v.status === 'published' ? 'Video archived' : 'Video published');
      load();
    } catch (err) {
      toast(err?.response?.data?.message ?? 'Action failed', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await videosAPI.remove(deleteTarget._id);
      toast('Video deleted');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast(err?.response?.data?.message ?? 'Delete failed', 'error');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🎬 Videos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Recorded classes and live classes — access-controlled by batch</p>
        </div>
        <button onClick={openCreate} className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700">
          + New Video
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <input
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-56"
          placeholder="Search title…"
          value={search}
          onChange={(e) => { setPage(1); setSearch(e.target.value); }}
        />
        {['', 'recorded', 'live'].map((t) => (
          <button
            key={t}
            onClick={() => { setPage(1); setTypeFilter(t); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              typeFilter === t ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
            }`}
          >
            {t === '' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        {['', 'draft', 'published', 'archived'].map((s) => (
          <button
            key={s}
            onClick={() => { setPage(1); setStatusFilter(s); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              statusFilter === s ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            {s === '' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🎬</p>
          <p className="text-gray-500 font-medium">No videos yet</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Title</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Access</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Teacher</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Views</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((v) => (
                <tr key={v._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 line-clamp-1 max-w-xs">{v.title?.en ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      {v.type === 'live' ? '🔴 Live' : '📼 Recorded'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 capitalize">
                    {v.accessType}{v.accessType === 'batch' ? ` (${v.allowedBatches?.length ?? 0})` : ''}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{v.teacher?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[v.status]}`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{v.viewCount ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => handlePublishToggle(v)} className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                        {v.status === 'published' ? 'Archive' : 'Publish'}
                      </button>
                      <button onClick={() => openEdit(v)} className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg text-primary-600 hover:bg-primary-50">
                        ✏️ Edit
                      </button>
                      <button onClick={() => setDeleteTarget(v)} className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg text-red-500 hover:bg-red-50">
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">← Prev</button>
            <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">Next →</button>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? `Edit: ${editTarget.title?.en}` : 'Create Video'} size="lg">
        <VideoForm form={form} setForm={setForm} onSubmit={handleSubmit} loading={saving} />
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Video"
        message={`Delete "${deleteTarget?.title?.en}"? This cannot be undone.`}
        danger
      />
    </div>
  );
}
