/**
 * ExamDates.jsx — admin CRUD for the exam calendar that powers the app's
 * home-screen countdown banner (GET /exam-dates/upcoming).
 */

import { useState, useEffect, useCallback } from 'react';
import { examDatesAPI } from '../api/client';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';

const empty = {
  examName: { en: '', hi: '' },
  examCategory: '',
  examDate: '',
  applyLastDate: '',
  officialUrl: '',
  isActive: true,
};

function daysUntil(dateStr) {
  const diff = new Date(dateStr).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.round(diff / 86400000);
}

export default function ExamDates() {
  const toast = useToast();
  const [examDates, setExamDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [modal, setModal] = useState(null); // null | 'create' | 'edit'
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    examDatesAPI.list()
      .then(({ data }) => setExamDates(data.data ?? []))
      .catch(() => toast('Failed to load exam dates', 'error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(empty); setEditId(null); setModal('create'); };
  const openEdit = (e) => {
    setForm({
      examName: { en: e.examName?.en ?? '', hi: e.examName?.hi ?? '' },
      examCategory: e.examCategory ?? '',
      examDate: e.examDate ? e.examDate.slice(0, 10) : '',
      applyLastDate: e.applyLastDate ? e.applyLastDate.slice(0, 10) : '',
      officialUrl: e.officialUrl ?? '',
      isActive: e.isActive ?? true,
    });
    setEditId(e._id);
    setModal('edit');
  };

  const handleSave = async () => {
    if (!form.examName.en.trim()) return toast('English exam name is required', 'error');
    if (!form.examCategory.trim()) return toast('Exam category is required', 'error');
    if (!form.examDate) return toast('Exam date is required', 'error');
    setSaving(true);
    try {
      const payload = {
        ...form,
        examCategory: form.examCategory.trim().toLowerCase(),
        applyLastDate: form.applyLastDate || null,
        officialUrl: form.officialUrl || null,
      };
      if (modal === 'create') {
        await examDatesAPI.create(payload);
        toast('Exam date added');
      } else {
        await examDatesAPI.update(editId, payload);
        toast('Exam date updated');
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
    if (!window.confirm('Delete this exam date? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await examDatesAPI.remove(id);
      toast('Exam date deleted');
      load();
    } catch (err) {
      toast(err?.response?.data?.message ?? 'Delete failed', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }));
  const setBilingual = (field, lang, val) =>
    setForm((f) => ({ ...f, [field]: { ...f[field], [lang]: val } }));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">📅 Exam Dates</h1>
          <p className="text-sm text-gray-500 mt-0.5">Powers the app's home-screen exam countdown</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          <span>+</span> New Exam Date
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : examDates.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">📅</div>
            <p className="text-gray-500 text-sm">No exam dates yet. Add the first one.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Exam</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Category</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Date</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Countdown</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {examDates.map((e) => {
                const d = daysUntil(e.examDate);
                return (
                  <tr key={e._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-800">
                      <div className="font-medium">{e.examName?.en}</div>
                      {e.examName?.hi && <div className="text-xs text-gray-400">{e.examName.hi}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded font-mono">{e.examCategory}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{new Date(e.examDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="px-4 py-3">
                      {d >= 0 ? (
                        <span className={`text-xs font-semibold ${d <= 7 ? 'text-red-600' : 'text-gray-500'}`}>{d === 0 ? 'Today' : `${d}d left`}</span>
                      ) : (
                        <span className="text-xs text-gray-300">Past</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${e.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {e.isActive ? 'Active' : 'Hidden'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(e)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="Edit">✏️</button>
                      <button
                        onClick={() => handleDelete(e._id)}
                        disabled={deleting === e._id}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete"
                      >{deleting === e._id ? '⏳' : '🗑️'}</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal === 'create' ? 'New Exam Date' : 'Edit Exam Date'} size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Exam Name (English) <span className="text-red-500">*</span></label>
            <input
              value={form.examName.en}
              onChange={(e) => setBilingual('examName', 'en', e.target.value)}
              placeholder="e.g. SSC CGL Tier 1"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Exam Name (Hindi)</label>
            <input
              value={form.examName.hi}
              onChange={(e) => setBilingual('examName', 'hi', e.target.value)}
              placeholder="e.g. एसएससी सीजीएल टियर 1"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
            <input
              value={form.examCategory}
              onChange={(e) => set('examCategory', e.target.value)}
              placeholder="ssc / railway / banking / bihar_si"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Exam Date <span className="text-red-500">*</span></label>
            <input
              type="date"
              value={form.examDate}
              onChange={(e) => set('examDate', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Apply Last Date (optional)</label>
            <input
              type="date"
              value={form.applyLastDate}
              onChange={(e) => set('applyLastDate', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Official URL (optional)</label>
            <input
              value={form.officialUrl}
              onChange={(e) => set('officialUrl', e.target.value)}
              placeholder="https://ssc.nic.in/..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} className="accent-primary-600" />
            Show in app countdown
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
