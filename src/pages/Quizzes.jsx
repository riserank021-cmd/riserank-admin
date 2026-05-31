import { useState, useEffect, useCallback } from 'react';
import { quizzesAPI, questionsAPI } from '../api/client';
import { Modal, ConfirmModal } from '../components/Modal';
import { useToast } from '../components/Toast';

const EXAM_TYPES = ['SSC', 'UPSC', 'Banking', 'Railway', 'State_PCS', 'Defence', 'Police', 'Teaching', 'Other'];
const QUIZ_TYPES = ['daily', 'practice', 'mock', 'category', 'custom'];

const EMPTY_FORM = {
  title: { en: '', hi: '' },
  description: { en: '', hi: '' },
  type: 'practice',
  examType: [],
  timeLimit: 30,
  totalMarks: 0,
  passingMarks: 0,
  isActive: true,
  isDaily: false,
  dailyDate: '',
  questions: [],   // array of question IDs
};

function QuizForm({ form, setForm, onSubmit, loading }) {
  const [qSearch, setQSearch] = useState('');
  const [qResults, setQResults] = useState([]);
  const [qSearching, setQSearching] = useState(false);

  const setField = (key, val) => setForm((p) => ({ ...p, [key]: val }));
  const setBilingual = (field, lang, val) =>
    setForm((p) => ({ ...p, [field]: { ...p[field], [lang]: val } }));

  const toggleExam = (e) =>
    setField('examType', form.examType.includes(e) ? form.examType.filter((x) => x !== e) : [...form.examType, e]);

  const searchQuestions = async () => {
    if (!qSearch.trim()) return;
    setQSearching(true);
    try {
      const { data } = await questionsAPI.list({ search: qSearch, limit: 10 });
      setQResults(data.data?.questions ?? data.data ?? []);
    } catch {
      /* ignore */
    } finally {
      setQSearching(false);
    }
  };

  const addQuestion = (q) => {
    if (!form.questions.find((x) => (x._id ?? x) === q._id)) {
      setField('questions', [...form.questions, q]);
    }
  };

  const removeQuestion = (id) =>
    setField('questions', form.questions.filter((q) => (q._id ?? q) !== id));

  const input = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Title */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
          Title <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <input className={input} value={form.title.en} onChange={(e) => setBilingual('title', 'en', e.target.value)} placeholder="Title (EN)" required />
          <input className={input} value={form.title.hi} onChange={(e) => setBilingual('title', 'hi', e.target.value)} placeholder="शीर्षक (HI)" />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Description</label>
        <div className="grid grid-cols-2 gap-2">
          <textarea className={input} rows={2} value={form.description.en} onChange={(e) => setBilingual('description', 'en', e.target.value)} placeholder="Description (EN)" />
          <textarea className={input} rows={2} value={form.description.hi} onChange={(e) => setBilingual('description', 'hi', e.target.value)} placeholder="विवरण (HI)" />
        </div>
      </div>

      {/* Type + Time */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Type</label>
          <select className={input} value={form.type} onChange={(e) => setField('type', e.target.value)}>
            {QUIZ_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Time Limit (min)</label>
          <input type="number" min={1} className={input} value={form.timeLimit} onChange={(e) => setField('timeLimit', +e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Total Marks</label>
          <input type="number" min={0} className={input} value={form.totalMarks} onChange={(e) => setField('totalMarks', +e.target.value)} />
        </div>
      </div>

      {/* Daily */}
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={form.isActive} onChange={(e) => setField('isActive', e.target.checked)} className="accent-primary-600" />
          Active
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={form.isDaily} onChange={(e) => setField('isDaily', e.target.checked)} className="accent-primary-600" />
          Daily Quiz
        </label>
        {form.isDaily && (
          <input
            type="date"
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={form.dailyDate}
            onChange={(e) => setField('dailyDate', e.target.value)}
          />
        )}
      </div>

      {/* Exam Types */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Exam Types</label>
        <div className="flex flex-wrap gap-2">
          {EXAM_TYPES.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => toggleExam(e)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                form.examType.includes(e)
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'
              }`}
            >{e}</button>
          ))}
        </div>
      </div>

      {/* Questions */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
          Questions ({form.questions.length} selected)
        </label>
        {form.questions.length > 0 && (
          <div className="border border-gray-200 rounded-lg divide-y mb-2 max-h-48 overflow-y-auto">
            {form.questions.map((q, i) => {
              const id = q._id ?? q;
              const text = q.text?.en ?? id;
              return (
                <div key={id} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <span className="text-gray-400 text-xs w-5">{i + 1}.</span>
                  <span className="flex-1 truncate text-gray-700">{text}</span>
                  <button type="button" onClick={() => removeQuestion(id)} className="text-red-400 hover:text-red-600 text-xs px-1">✕</button>
                </div>
              );
            })}
          </div>
        )}
        <div className="flex gap-2">
          <input
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Search questions to add…"
            value={qSearch}
            onChange={(e) => setQSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchQuestions())}
          />
          <button
            type="button"
            onClick={searchQuestions}
            disabled={qSearching}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-sm rounded-lg border border-gray-300 transition-colors"
          >
            {qSearching ? '…' : 'Search'}
          </button>
        </div>
        {qResults.length > 0 && (
          <div className="border border-gray-200 rounded-lg divide-y mt-1 max-h-40 overflow-y-auto">
            {qResults.map((q) => (
              <button
                key={q._id}
                type="button"
                onClick={() => addQuestion(q)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-primary-50 text-gray-700 truncate transition-colors"
              >
                + {q.text?.en ?? q._id}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t">
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {loading ? 'Saving…' : 'Save Quiz'}
        </button>
      </div>
    </form>
  );
}

export default function Quizzes() {
  const toast = useToast();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterType, setFilterType] = useState('');

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
      if (filterType) params.type = filterType;
      const { data } = await quizzesAPI.list(params);
      setQuizzes(data.data?.quizzes ?? data.data ?? []);
      setTotal(data.data?.total ?? data.total ?? 0);
    } catch {
      toast('Failed to load quizzes', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, filterType]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (q) => {
    setEditTarget(q);
    setForm({
      title: q.title ?? { en: '', hi: '' },
      description: q.description ?? { en: '', hi: '' },
      type: q.type ?? 'practice',
      examType: q.examType ?? [],
      timeLimit: q.timeLimit ?? 30,
      totalMarks: q.totalMarks ?? 0,
      passingMarks: q.passingMarks ?? 0,
      isActive: q.isActive !== false,
      isDaily: q.isDaily ?? false,
      dailyDate: q.dailyDate ? q.dailyDate.slice(0, 10) : '',
      questions: q.questions ?? [],
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      questions: form.questions.map((q) => q._id ?? q),
    };
    try {
      if (editTarget) {
        await quizzesAPI.update(editTarget._id, payload);
        toast('Quiz updated');
      } else {
        await quizzesAPI.create(payload);
        toast('Quiz created');
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
    setDeleting(true);
    try {
      await quizzesAPI.remove(deleteTarget._id);
      toast('Quiz deleted');
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
          <h1 className="text-xl font-bold text-gray-900">Quizzes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString()} total</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition-colors">
          <span>+</span> New Quiz
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Types</option>
          {QUIZ_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : quizzes.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No quizzes found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Type</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Qs</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {quizzes.map((q) => (
                <tr key={q._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800 truncate">{q.title?.en ?? '—'}</div>
                    {q.title?.hi && <div className="text-xs text-gray-400 truncate">{q.title.hi}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">{q.type}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{q.questions?.length ?? 0}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${q.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {q.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(q)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">✏️</button>
                      <button onClick={() => setDeleteTarget(q)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">🗑️</button>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Edit Quiz' : 'New Quiz'} size="lg">
        <QuizForm form={form} setForm={setForm} onSubmit={handleSubmit} loading={saving} />
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Quiz"
        message={`Delete "${deleteTarget?.title?.en}"? This cannot be undone.`}
        danger
        loading={deleting}
      />
    </div>
  );
}
