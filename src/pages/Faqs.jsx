/**
 * Faqs.jsx — admin CRUD for the FAQ content shown on the app's Help screen.
 */

import { useState, useEffect, useCallback } from 'react';
import { faqsAPI } from '../api/client';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';

const empty = {
  question: { en: '', hi: '' },
  answer: { en: '', hi: '' },
  category: 'general',
  order: 0,
  isActive: true,
};

export default function Faqs() {
  const toast = useToast();
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    faqsAPI.list()
      .then(({ data }) => setFaqs(data.data ?? []))
      .catch(() => toast('Failed to load FAQs', 'error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(empty); setEditId(null); setModal('create'); };
  const openEdit = (f) => {
    setForm({
      question: { en: f.question?.en ?? '', hi: f.question?.hi ?? '' },
      answer: { en: f.answer?.en ?? '', hi: f.answer?.hi ?? '' },
      category: f.category ?? 'general',
      order: f.order ?? 0,
      isActive: f.isActive ?? true,
    });
    setEditId(f._id);
    setModal('edit');
  };

  const handleSave = async () => {
    if (!form.question.en.trim() || !form.answer.en.trim()) return toast('English question and answer are required', 'error');
    setSaving(true);
    try {
      if (modal === 'create') {
        await faqsAPI.create(form);
        toast('FAQ created');
      } else {
        await faqsAPI.update(editId, form);
        toast('FAQ updated');
      }
      setModal(null);
      load();
    } catch (err) {
      toast(err?.response?.data?.message ?? 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this FAQ?')) return;
    setDeleting(id);
    try {
      await faqsAPI.remove(id);
      toast('FAQ deleted');
      load();
    } catch (err) {
      toast(err?.response?.data?.message ?? 'Delete failed', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }));
  const setBilingual = (field, lang, val) => setForm((f) => ({ ...f, [field]: { ...f[field], [lang]: val } }));

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">❓ FAQs</h1>
          <p className="text-sm text-gray-500 mt-0.5">Shown on the app's Help screen</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          <span>+</span> New FAQ
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Loading…</div>
      ) : faqs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-4xl mb-3">❓</div>
          <p className="text-gray-500 text-sm">No FAQs yet. Add the first one.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {faqs.map((f) => (
            <div key={f._id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-block bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded font-mono">{f.category}</span>
                    {!f.isActive && <span className="text-xs text-gray-400">Hidden</span>}
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{f.question?.en}</p>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{f.answer?.en}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(f)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="Edit">✏️</button>
                  <button
                    onClick={() => handleDelete(f._id)}
                    disabled={deleting === f._id}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Delete"
                  >{deleting === f._id ? '⏳' : '🗑️'}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal === 'create' ? 'New FAQ' : 'Edit FAQ'} size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Question (English) <span className="text-red-500">*</span></label>
            <input
              value={form.question.en}
              onChange={(e) => setBilingual('question', 'en', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Question (Hindi)</label>
            <input
              value={form.question.hi}
              onChange={(e) => setBilingual('question', 'hi', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Answer (English) <span className="text-red-500">*</span></label>
            <textarea
              value={form.answer.en}
              onChange={(e) => setBilingual('answer', 'en', e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Answer (Hindi)</label>
            <textarea
              value={form.answer.hi}
              onChange={(e) => setBilingual('answer', 'hi', e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
              <input
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                placeholder="general / account / quizzes"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Order</label>
              <input
                type="number"
                value={form.order}
                onChange={(e) => set('order', parseInt(e.target.value, 10) || 0)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} className="accent-primary-600" />
            Show in app
          </label>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
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
