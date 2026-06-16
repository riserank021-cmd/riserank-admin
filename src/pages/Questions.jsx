import { useState, useEffect, useCallback } from 'react';
import { questionsAPI } from '../api/client';
import { Modal, ConfirmModal } from '../components/Modal';
import { useToast } from '../components/Toast';

// Matches backend EXAM_CATEGORIES enum exactly
const EXAM_CATEGORIES = [
  { value: 'ssc',      label: 'SSC' },
  { value: 'railway',  label: 'Railway' },
  { value: 'banking',  label: 'Banking' },
  { value: 'bihar_si', label: 'Bihar SI' },
];

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const OPTION_KEYS = ['A', 'B', 'C', 'D'];

// options stored as dict in form state; converted to array on submit
const EMPTY_OPTIONS = { A: { en: '', hi: '' }, B: { en: '', hi: '' }, C: { en: '', hi: '' }, D: { en: '', hi: '' } };

const EMPTY_FORM = {
  questionText: { en: '', hi: '' },
  options: EMPTY_OPTIONS,
  correctOption: 'A',
  explanation: { en: '', hi: '' },
  examCategory: 'ssc',
  subject: '',
  topic: '',
  difficulty: 'medium',
  tags: '',
};

// Convert backend array [{key, text}] → form dict {A: {en,hi}, ...}
function optionsArrayToDict(arr) {
  const dict = { ...EMPTY_OPTIONS };
  if (!Array.isArray(arr)) return dict;
  arr.forEach(({ key, text }) => {
    if (key && text) dict[key] = { en: text.en ?? '', hi: text.hi ?? '' };
  });
  return dict;
}

// Convert form dict {A: {en,hi}, ...} → backend array [{key, text}]
function optionsDictToArray(dict) {
  return OPTION_KEYS.map((key) => ({ key, text: dict[key] ?? { en: '', hi: '' } }));
}

function BilingualField({ label, value, onChange, required, multiline }) {
  const Tag = multiline ? 'textarea' : 'input';
  const base = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';
  const rows = multiline ? { rows: 2 } : {};
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-xs text-gray-400 mb-1">English</div>
          <Tag className={base} value={value?.en ?? ''} onChange={(e) => onChange('en', e.target.value)} required={required} placeholder={`${label} (EN)`} {...rows} />
        </div>
        <div>
          <div className="text-xs text-gray-400 mb-1">हिंदी</div>
          <Tag className={base} value={value?.hi ?? ''} onChange={(e) => onChange('hi', e.target.value)} placeholder={`${label} (HI)`} {...rows} />
        </div>
      </div>
    </div>
  );
}

function QuestionForm({ form, setForm, onSubmit, loading }) {
  const setField = (key, val) => setForm((p) => ({ ...p, [key]: val }));
  const setBilingual = (field, lang, val) =>
    setForm((p) => ({ ...p, [field]: { ...p[field], [lang]: val } }));
  const setOption = (opt, lang, val) =>
    setForm((p) => ({ ...p, options: { ...p.options, [opt]: { ...p.options[opt], [lang]: val } } }));

  const input = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Question Text */}
      <BilingualField
        label="Question Text"
        value={form.questionText}
        onChange={(lang, val) => setBilingual('questionText', lang, val)}
        required
        multiline
      />

      {/* Options */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
          Options <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          {OPTION_KEYS.map((opt) => (
            <div key={opt} className="flex items-start gap-2">
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="radio"
                  name="correctOption"
                  value={opt}
                  checked={form.correctOption === opt}
                  onChange={() => setField('correctOption', opt)}
                  className="accent-primary-600"
                />
                <span className="text-sm font-bold text-gray-700 w-4">{opt}</span>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-2">
                <input
                  className={input}
                  value={form.options[opt]?.en ?? ''}
                  onChange={(e) => setOption(opt, 'en', e.target.value)}
                  placeholder={`Option ${opt} (EN)`}
                  required
                />
                <input
                  className={input}
                  value={form.options[opt]?.hi ?? ''}
                  onChange={(e) => setOption(opt, 'hi', e.target.value)}
                  placeholder={`Option ${opt} (HI)`}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1.5">Select the radio next to the correct answer.</p>
      </div>

      {/* Explanation */}
      <BilingualField
        label="Explanation"
        value={form.explanation}
        onChange={(lang, val) => setBilingual('explanation', lang, val)}
        multiline
      />

      {/* Exam Category + Difficulty */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
            Exam Category <span className="text-red-500">*</span>
          </label>
          <select className={input} value={form.examCategory} onChange={(e) => setField('examCategory', e.target.value)}>
            {EXAM_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
            Difficulty <span className="text-red-500">*</span>
          </label>
          <select className={input} value={form.difficulty} onChange={(e) => setField('difficulty', e.target.value)}>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
          </select>
        </div>
      </div>

      {/* Subject + Topic */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Subject</label>
          <input className={input} value={form.subject} onChange={(e) => setField('subject', e.target.value)} placeholder="e.g. History, Economics" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Topic</label>
          <input className={input} value={form.topic} onChange={(e) => setField('topic', e.target.value)} placeholder="e.g. Mughal Period, GDP" />
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Tags</label>
        <input
          className={input}
          value={form.tags}
          onChange={(e) => setField('tags', e.target.value)}
          placeholder="Comma-separated (e.g. history, polity, 2024)"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t">
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {loading ? 'Saving…' : 'Save Question'}
        </button>
      </div>
    </form>
  );
}

function DiffBadge({ diff }) {
  const colors = { easy: 'bg-green-100 text-green-700', medium: 'bg-yellow-100 text-yellow-700', hard: 'bg-red-100 text-red-700' };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[diff] ?? 'bg-gray-100 text-gray-600'}`}>
      {diff}
    </span>
  );
}

export default function Questions() {
  const toast = useToast();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [filterDiff, setFilterDiff] = useState('');
  const [filterCat, setFilterCat] = useState('');

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
      if (search)     params.search       = search;
      if (filterDiff) params.difficulty   = filterDiff;
      if (filterCat)  params.examCategory = filterCat;  // backend param name
      const { data } = await questionsAPI.list(params);
      setQuestions(data.data?.questions ?? data.data ?? []);
      setTotal(data.data?.total ?? data.total ?? 0);
    } catch {
      toast('Failed to load questions', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, filterDiff, filterCat]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (q) => {
    setEditTarget(q);
    setForm({
      questionText: q.questionText ?? { en: '', hi: '' },
      options:      optionsArrayToDict(q.options),
      correctOption: q.correctOption ?? 'A',
      explanation:  q.explanation   ?? { en: '', hi: '' },
      examCategory: q.examCategory  ?? 'ssc',
      subject:      q.subject       ?? '',
      topic:        q.topic         ?? '',
      difficulty:   q.difficulty    ?? 'medium',
      tags: Array.isArray(q.tags) ? q.tags.join(', ') : (q.tags ?? ''),
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      questionText: form.questionText,
      options:      optionsDictToArray(form.options),
      correctOption: form.correctOption,
      explanation:  form.explanation,
      examCategory: form.examCategory,
      difficulty:   form.difficulty,
      subject:      form.subject || undefined,
      topic:        form.topic   || undefined,
      tags: form.tags ? form.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean) : [],
    };
    try {
      if (editTarget) {
        await questionsAPI.update(editTarget._id, payload);
        toast('Question updated');
      } else {
        await questionsAPI.create(payload);
        toast('Question created');
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
      await questionsAPI.remove(deleteTarget._id);
      toast('Question deleted');
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Questions</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString()} total</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <span className="text-base">+</span> New Question
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="search"
          placeholder="Search questions…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-64"
        />
        <select
          value={filterDiff}
          onChange={(e) => { setFilterDiff(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Difficulties</option>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
          ))}
        </select>
        <select
          value={filterCat}
          onChange={(e) => { setFilterCat(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Categories</option>
          {EXAM_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : questions.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No questions found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Question</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Category</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Difficulty</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {questions.map((q) => (
                <tr key={q._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-800 max-w-0">
                    <div className="truncate font-medium">{q.questionText?.en ?? '—'}</div>
                    {q.questionText?.hi && (
                      <div className="truncate text-xs text-gray-400">{q.questionText.hi}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      {EXAM_CATEGORIES.find((c) => c.value === q.examCategory)?.label ?? q.examCategory ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3"><DiffBadge diff={q.difficulty} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEdit(q)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                        title="Edit"
                      >✏️</button>
                      <button
                        onClick={() => setDeleteTarget(q)}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete"
                      >🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Edit Question' : 'New Question'} size="lg">
        <QuestionForm form={form} setForm={setForm} onSubmit={handleSubmit} loading={saving} />
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Question"
        message={`Delete "${deleteTarget?.questionText?.en?.slice(0, 60)}…"? This cannot be undone.`}
        danger
        loading={deleting}
      />
    </div>
  );
}
