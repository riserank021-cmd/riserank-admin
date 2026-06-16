import { useState, useEffect, useCallback } from 'react';
import { currentAffairsAPI } from '../api/client';
import { Modal, ConfirmModal } from '../components/Modal';
import { useToast } from '../components/Toast';

const CATEGORIES_CA = ['politics', 'economy', 'science', 'sports', 'international', 'environment', 'defence', 'awards', 'other'];

const EMPTY_FORM = {
  title: { en: '', hi: '' },
  summary: { en: '', hi: '' },
  content: { en: '', hi: '' },
  category: 'other',
  tags: '',
  source: '',
  sourceUrl: '',
  publishDate: new Date().toISOString().slice(0, 10),
  isPublished: false,
};

function StatusBadge({ status }) {
  const map = {
    published: 'bg-green-100 text-green-700',
    draft: 'bg-yellow-100 text-yellow-700',
    archived: 'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

// Free Google Translate helper
async function googleTranslate(text, targetLang = 'hi') {
  if (!text?.trim()) return '';
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    const data = await res.json();
    return data[0].map((s) => s[0]).join('');
  } catch { return ''; }
}

function AffairForm({ form, setForm, onSubmit, loading }) {
  const [translating, setTranslating] = useState(false);
  const setField = (key, val) => setForm((p) => ({ ...p, [key]: val }));
  const setBilingual = (field, lang, val) =>
    setForm((p) => ({ ...p, [field]: { ...p[field], [lang]: val } }));

  const input = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

  const handleAutoTranslate = async () => {
    setTranslating(true);
    const [titleHi, summaryHi, contentHi] = await Promise.all([
      googleTranslate(form.title?.en),
      googleTranslate(form.summary?.en),
      googleTranslate(form.content?.en),
    ]);
    setForm((p) => ({
      ...p,
      title:   { ...p.title,   hi: titleHi   || p.title.hi },
      summary: { ...p.summary, hi: summaryHi  || p.summary.hi },
      content: { ...p.content, hi: contentHi  || p.content.hi },
    }));
    setTranslating(false);
  };

  const BiRow = ({ label, field, multiline, required }) => {
    const Tag = multiline ? 'textarea' : 'input';
    const rows = multiline ? { rows: 3 } : {};
    return (
      <div>
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="grid grid-cols-2 gap-2">
          <Tag className={input} value={form[field]?.en ?? ''} onChange={(e) => setBilingual(field, 'en', e.target.value)} placeholder={`${label} (EN)`} required={required} {...rows} />
          <Tag className={`${input} ${!form[field]?.hi ? 'border-orange-300 bg-orange-50' : ''}`} value={form[field]?.hi ?? ''} onChange={(e) => setBilingual(field, 'hi', e.target.value)} placeholder={`${label} (HI) — required`} {...rows} />
        </div>
      </div>
    );
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">Fill English first, then auto-translate or type Hindi manually.</p>
        <button
          type="button"
          onClick={handleAutoTranslate}
          disabled={translating || !form.title?.en}
          className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
        >
          {translating ? '⏳ Translating…' : '🔄 Auto-translate to Hindi'}
        </button>
      </div>
      <BiRow label="Title" field="title" required />
      <BiRow label="Summary" field="summary" multiline />
      <BiRow label="Full Content" field="content" multiline />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Category</label>
          <select className={input} value={form.category} onChange={(e) => setField('category', e.target.value)}>
            {CATEGORIES_CA.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Publish Date</label>
          <input type="date" className={input} value={form.publishDate} onChange={(e) => setField('publishDate', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Source Name</label>
          <input className={input} value={form.source} onChange={(e) => setField('source', e.target.value)} placeholder="e.g. The Hindu" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Source URL</label>
          <input type="url" className={input} value={form.sourceUrl} onChange={(e) => setField('sourceUrl', e.target.value)} placeholder="https://…" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Tags</label>
        <input className={input} value={form.tags} onChange={(e) => setField('tags', e.target.value)} placeholder="Comma-separated (e.g. Budget, 2025)" />
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input type="checkbox" checked={form.isPublished} onChange={(e) => setField('isPublished', e.target.checked)} className="accent-primary-600" />
        Publish immediately
      </label>

      <div className="flex justify-end gap-3 pt-2 border-t">
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {loading ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}

export default function CurrentAffairs() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterCat, setFilterCat] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (filterCat)    params.category = filterCat;
      if (filterStatus) params.status   = filterStatus;
      const { data } = await currentAffairsAPI.list(params);
      setItems(data.data?.affairs ?? data.data ?? []);
      setTotal(data.data?.total ?? data.total ?? 0);
    } catch {
      toast('Failed to load current affairs', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, filterCat, filterStatus]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditTarget(item);
    setForm({
      title: item.title ?? { en: '', hi: '' },
      summary: item.summary ?? { en: '', hi: '' },
      content: item.body ?? item.content ?? { en: '', hi: '' },
      category: item.category ?? 'other',
      tags: Array.isArray(item.tags) ? item.tags.join(', ') : (item.tags ?? ''),
      source: item.source ?? '',
      sourceUrl: item.sourceUrl ?? '',
      publishDate: item.publishDate ? item.publishDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
      isPublished: item.status === 'published',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      title: form.title,
      body: form.content,          // backend expects 'body' not 'content'
      summary: form.summary,
      status: form.isPublished ? 'published' : 'draft',
      tags: form.tags ? form.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean) : [],
      examTags: [],
      // category & source omitted — category must be ObjectId, source not in schema
    };
    try {
      if (editTarget) {
        await currentAffairsAPI.update(editTarget._id, payload);
        toast('Updated');
      } else {
        await currentAffairsAPI.create(payload);
        toast('Created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast(err?.response?.data?.message ?? 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (item) => {
    try {
      await currentAffairsAPI.publish(item._id);
      toast('Published');
      load();
    } catch {
      toast('Publish failed', 'error');
    }
  };

  const handleArchive = async (item) => {
    try {
      await currentAffairsAPI.archive(item._id);
      toast('Archived');
      load();
    } catch {
      toast('Archive failed', 'error');
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await currentAffairsAPI.remove(deleteTarget._id);
      toast('Deleted');
      setDeleteTarget(null);
      load();
    } catch {
      toast('Delete failed', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Current Affairs</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString()} total</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition-colors">
          <span>+</span> New Article
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <select
          value={filterCat}
          onChange={(e) => { setFilterCat(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Categories</option>
          {CATEGORIES_CA.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No articles found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Category</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Date</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <tr key={item._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800 truncate">{item.title?.en ?? '—'}</div>
                    {item.title?.hi && <div className="text-xs text-gray-400 truncate">{item.title.hi}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 capitalize">
                    {item.category?.name?.en ?? (typeof item.category === 'string' ? item.category : '—')}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={item.status ?? 'draft'} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {item.status !== 'published' && (
                        <button onClick={() => handlePublish(item)} className="p-1.5 rounded hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors" title="Publish">✅</button>
                      )}
                      {item.status === 'published' && (
                        <button onClick={() => handleArchive(item)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors" title="Archive">📦</button>
                      )}
                      <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">✏️</button>
                      <button onClick={() => setDeleteTarget(item)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">🗑️</button>
                    </div>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Edit Article' : 'New Article'} size="lg">
        <AffairForm form={form} setForm={setForm} onSubmit={handleSubmit} loading={saving} />
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Article"
        message={`Delete "${deleteTarget?.title?.en}"? This cannot be undone.`}
        danger
        loading={deleting}
      />
    </div>
  );
}
