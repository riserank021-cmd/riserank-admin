import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';

const empty = { name: { en: '', hi: '' }, description: { en: '', hi: '' } };

function slugify(str) {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export default function Categories() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [modal, setModal] = useState(null); // null | 'create' | 'edit'
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/categories')
      .then(({ data }) => setCategories(data.data?.categories ?? data.data ?? []))
      .catch(() => showToast('Failed to load categories', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(empty); setEditId(null); setModal('create'); };
  const openEdit = (cat) => {
    setForm({
      name: { en: cat.name?.en ?? '', hi: cat.name?.hi ?? '' },
      description: { en: cat.description?.en ?? '', hi: cat.description?.hi ?? '' },
    });
    setEditId(cat._id);
    setModal('edit');
  };

  const handleSave = async () => {
    if (!form.name.en.trim()) return showToast('English name is required', 'error');
    setSaving(true);
    try {
      const payload = { ...form, slug: slugify(form.name.en) };
      if (modal === 'create') {
        await api.post('/categories', payload);
        showToast('Category created', 'success');
      } else {
        await api.put(`/categories/${editId}`, payload);
        showToast('Category updated', 'success');
      }
      setModal(null);
      load();
    } catch (err) {
      showToast(err?.response?.data?.message ?? 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this category? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await api.delete(`/categories/${id}`);
      showToast('Category deleted', 'success');
      load();
    } catch (err) {
      showToast(err?.response?.data?.message ?? 'Delete failed', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const set = (field, lang, val) =>
    setForm(f => ({ ...f, [field]: { ...f[field], [lang]: val } }));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500 mt-0.5">{categories.length} categories</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          <span>+</span> New Category
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
              <div className="h-5 bg-gray-100 rounded w-2/3 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-full mb-3" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-4xl mb-3">📂</div>
          <p className="text-gray-500 text-sm">No categories yet. Create the first one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div key={cat._id} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate">{cat.name?.en}</div>
                  {cat.name?.hi && (
                    <div className="text-sm text-gray-500 truncate">{cat.name.hi}</div>
                  )}
                  {cat.description?.en && (
                    <div className="text-xs text-gray-400 mt-1 line-clamp-2">{cat.description.en}</div>
                  )}
                  <div className="mt-2">
                    <span className="inline-block bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded font-mono">
                      {cat.slug}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEdit(cat)}
                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    title="Edit"
                  >✏️</button>
                  <button
                    onClick={() => handleDelete(cat._id)}
                    disabled={deleting === cat._id}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Delete"
                  >{deleting === cat._id ? '⏳' : '🗑️'}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal === 'create' ? 'New Category' : 'Edit Category'}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name (English) <span className="text-red-500">*</span></label>
            <input
              value={form.name.en}
              onChange={e => set('name', 'en', e.target.value)}
              placeholder="e.g. General Knowledge"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
            {form.name.en && (
              <p className="text-xs text-gray-400 mt-1">Slug: <span className="font-mono">{slugify(form.name.en)}</span></p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name (Hindi)</label>
            <input
              value={form.name.hi}
              onChange={e => set('name', 'hi', e.target.value)}
              placeholder="e.g. सामान्य ज्ञान"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description (English)</label>
            <textarea
              value={form.description.en}
              onChange={e => set('description', 'en', e.target.value)}
              rows={2}
              placeholder="Short description of this category"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description (Hindi)</label>
            <textarea
              value={form.description.hi}
              onChange={e => set('description', 'hi', e.target.value)}
              rows={2}
              placeholder="इस श्रेणी का संक्षिप्त विवरण"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : modal === 'create' ? 'Create' : 'Save changes'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
