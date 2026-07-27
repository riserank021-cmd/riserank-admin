/**
 * Playlists.jsx — Playlist Management.
 * Playlist ordering is the authoritative source for video order (see
 * Playlist.js from Phase 1) — this page's video picker writes that order.
 */

import { useState, useEffect, useCallback } from 'react';
import { playlistsAPI, teachersAPI, videosAPI } from '../api/client';
import { Modal, ConfirmModal } from '../components/Modal';
import { useToast } from '../components/Toast';

const EMPTY_FORM = { title: { en: '', hi: '' }, description: { en: '', hi: '' }, thumbnailUrl: '', teacher: '' };
const input = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';
const label = 'block text-xs font-semibold text-gray-600 mb-1';

function PlaylistForm({ form, setForm, onSubmit, loading }) {
  const [teachers, setTeachers] = useState([]);
  useEffect(() => { teachersAPI.list({ limit: 100 }).then(({ data }) => setTeachers(data.data ?? [])).catch(() => {}); }, []);

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));
  const setBi = (field, lang, val) => setForm((p) => ({ ...p, [field]: { ...p[field], [lang]: val } }));

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Title (English) *</label>
          <input className={input} value={form.title.en} onChange={(e) => setBi('title', 'en', e.target.value)} required />
        </div>
        <div>
          <label className={label}>Title (Hindi) *</label>
          <input className={input} value={form.title.hi} onChange={(e) => setBi('title', 'hi', e.target.value)} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Description (English)</label>
          <textarea className={`${input} resize-none`} rows={2} value={form.description.en} onChange={(e) => setBi('description', 'en', e.target.value)} />
        </div>
        <div>
          <label className={label}>Description (Hindi)</label>
          <textarea className={`${input} resize-none`} rows={2} value={form.description.hi} onChange={(e) => setBi('description', 'hi', e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Thumbnail URL</label>
          <input className={input} value={form.thumbnailUrl} onChange={(e) => set('thumbnailUrl', e.target.value)} />
        </div>
        <div>
          <label className={label}>Teacher</label>
          <select className={input} value={form.teacher} onChange={(e) => set('teacher', e.target.value)}>
            <option value="">— None —</option>
            {teachers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <button type="submit" disabled={loading} className="px-6 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50">
          {loading ? 'Saving…' : 'Save Playlist'}
        </button>
      </div>
    </form>
  );
}

// ── Manage Videos (ordering) modal ──────────────────────────────────────────
function ManageVideos({ playlist, onClose }) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [ordered, setOrdered] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    playlistsAPI.getById(playlist._id).then(({ data }) => {
      const p = data.data?.playlist ?? data.data;
      setOrdered((p.videos ?? []).map((entry) => entry.video).filter(Boolean));
    }).catch(() => toast('Failed to load playlist videos', 'error'));
  }, [playlist._id]);

  const doSearch = async () => {
    if (!search.trim()) return;
    try {
      const { data } = await videosAPI.list({ search: search.trim(), limit: 15 });
      setResults(data.data ?? []);
    } catch {
      /* ignore */
    }
  };

  const isAdded = (id) => ordered.some((v) => v._id === id);
  const add = (v) => !isAdded(v._id) && setOrdered((o) => [...o, v]);
  const remove = (id) => setOrdered((o) => o.filter((v) => v._id !== id));
  const move = (idx, dir) => {
    setOrdered((o) => {
      const next = [...o];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return o;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const videos = ordered.map((v, i) => ({ video: v._id, order: i }));
      await playlistsAPI.setVideos(playlist._id, videos);
      toast('Playlist order saved');
      onClose();
    } catch (err) {
      toast(err?.response?.data?.message ?? 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Manage Videos — ${playlist.title?.en}`} size="lg">
      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            className={`${input} flex-1`}
            placeholder="Search videos by title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doSearch()}
          />
          <button type="button" onClick={doSearch} className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700">Search</button>
        </div>

        {results.length > 0 && (
          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-40 overflow-y-auto">
            {results.map((v) => (
              <div key={v._id} className="flex items-center justify-between px-3 py-2">
                <p className="text-sm text-gray-800 truncate">{v.title?.en}</p>
                <button
                  onClick={() => (isAdded(v._id) ? remove(v._id) : add(v))}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0 ${isAdded(v._id) ? 'bg-red-50 text-red-600' : 'bg-primary-50 text-primary-700'}`}
                >
                  {isAdded(v._id) ? '✕ Remove' : '+ Add'}
                </button>
              </div>
            ))}
          </div>
        )}

        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1.5">{ordered.length} video{ordered.length !== 1 ? 's' : ''} — reorder with the arrows</p>
          <div className="border border-green-200 bg-green-50 rounded-lg divide-y divide-green-100 max-h-64 overflow-y-auto">
            {ordered.map((v, i) => (
              <div key={v._id} className="flex items-center gap-3 px-3 py-2">
                <span className="w-6 text-center text-xs text-gray-400">{i + 1}</span>
                <p className="flex-1 text-sm text-gray-700 truncate">{v.title?.en}</p>
                <button onClick={() => move(i, -1)} disabled={i === 0} className="text-xs text-gray-500 disabled:opacity-30">↑</button>
                <button onClick={() => move(i, 1)} disabled={i === ordered.length - 1} className="text-xs text-gray-500 disabled:opacity-30">↓</button>
                <button onClick={() => remove(v._id)} className="text-xs text-red-500">✕</button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-gray-100">
          <button onClick={save} disabled={saving} className="px-6 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Order'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function Playlists() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [manageTarget, setManageTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await playlistsAPI.list({ limit: 100 });
      setItems(data.data ?? []);
    } catch {
      toast('Failed to load playlists', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (p) => {
    setEditTarget(p);
    setForm({
      title: p.title ?? { en: '', hi: '' },
      description: p.description ?? { en: '', hi: '' },
      thumbnailUrl: p.thumbnailUrl ?? '',
      teacher: p.teacher?._id ?? p.teacher ?? '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.teacher) delete payload.teacher;
      if (editTarget) {
        await playlistsAPI.update(editTarget._id, payload);
        toast('Playlist updated');
      } else {
        await playlistsAPI.create(payload);
        toast('Playlist created (unpublished — add videos, then publish)');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast(err?.response?.data?.message ?? 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (p) => {
    try {
      await playlistsAPI.update(p._id, { isPublished: !p.isPublished });
      toast(p.isPublished ? 'Playlist unpublished' : 'Playlist published');
      load();
    } catch (err) {
      toast(err?.response?.data?.message ?? 'Action failed', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await playlistsAPI.remove(deleteTarget._id);
      toast('Playlist deleted');
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
          <h1 className="text-2xl font-bold text-gray-900">📁 Playlists</h1>
          <p className="text-sm text-gray-500 mt-0.5">Ordered series of videos (a "course")</p>
        </div>
        <button onClick={openCreate} className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700">
          + New Playlist
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📁</p>
          <p className="text-gray-500 font-medium">No playlists yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((p) => (
            <div key={p._id} className="border border-gray-200 rounded-xl p-4 bg-white">
              <div className="flex items-start justify-between mb-2">
                <p className="font-semibold text-gray-900 line-clamp-1">{p.title?.en}</p>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.isPublished ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {p.isPublished ? 'Published' : 'Draft'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-3">{p.teacher?.name ?? 'No teacher assigned'}</p>
              <div className="flex gap-2">
                <button onClick={() => setManageTarget(p)} className="flex-1 text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg text-primary-600 hover:bg-primary-50">
                  🎬 Videos
                </button>
                <button onClick={() => togglePublish(p)} className="flex-1 text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                  {p.isPublished ? 'Unpublish' : 'Publish'}
                </button>
                <button onClick={() => openEdit(p)} className="text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">✏️</button>
                <button onClick={() => setDeleteTarget(p)} className="text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg text-red-500 hover:bg-red-50">🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? `Edit: ${editTarget.title?.en}` : 'Create Playlist'} size="md">
        <PlaylistForm form={form} setForm={setForm} onSubmit={handleSubmit} loading={saving} />
      </Modal>

      {manageTarget && <ManageVideos playlist={manageTarget} onClose={() => { setManageTarget(null); load(); }} />}

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Playlist"
        message={`Delete "${deleteTarget?.title?.en}"? Videos in it are not deleted, just unlinked.`}
        danger
      />
    </div>
  );
}
