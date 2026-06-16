/**
 * LiveTests.jsx — Admin page to create, edit, and manage Live Tests.
 * - Create / edit test (title, schedule, duration, category, negative marking)
 * - Add/remove questions via search picker
 * - Change status manually (upcoming → live → ended)
 * - View live leaderboard for ended tests
 */

import { useState, useEffect, useCallback } from 'react';
import { liveTestsAPI, questionsAPI } from '../api/client';
import { Modal, ConfirmModal } from '../components/Modal';
import { useToast } from '../components/Toast';

const EXAM_CATEGORIES = [
  { value: 'ssc',      label: 'SSC' },
  { value: 'railway',  label: 'Railway' },
  { value: 'banking',  label: 'Banking' },
  { value: 'bihar_si', label: 'Bihar SI' },
];

const STATUS_OPTIONS = ['upcoming', 'live', 'ended'];

const EMPTY_FORM = {
  title:             { en: '', hi: '' },
  description:       { en: '', hi: '' },
  examCategory:      'ssc',
  scheduledAt:       '',        // datetime-local value
  durationMinutes:   30,
  totalMarks:        0,
  negativeMarking:   false,
  negativeMarkValue: 0.25,
  questions:         [],        // array of full question objects; submitted as IDs
};

// ── Question Picker sub-component ─────────────────────────────────────────────
function QuestionPicker({ selectedQuestions, onAdd, onRemove }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const doSearch = async () => {
    if (!search.trim() && !category) return;
    setSearching(true);
    try {
      const { data } = await questionsAPI.list({
        search: search.trim() || undefined,
        examCategory: category || undefined,
        limit: 15,
      });
      setResults(data.data?.questions ?? data.data ?? []);
    } catch {
      /* ignore */
    } finally {
      setSearching(false);
    }
  };

  const isAdded = (id) => selectedQuestions.some((q) => (q._id ?? q) === id);

  const input = 'px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="flex gap-2">
        <input
          className={`${input} flex-1`}
          placeholder="Search questions by text or topic…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && doSearch()}
        />
        <select
          className={`${input} w-36`}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {EXAM_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={doSearch}
          className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700"
        >
          {searching ? '…' : 'Search'}
        </button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-52 overflow-y-auto">
          {results.map((q) => (
            <div key={q._id} className="flex items-start gap-3 px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 line-clamp-2">{q.questionText?.en ?? q.questionText}</p>
                <span className="text-xs text-gray-400">{q.examCategory} · {q.difficulty}</span>
              </div>
              <button
                type="button"
                onClick={() => isAdded(q._id) ? onRemove(q._id) : onAdd(q)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0 transition-colors ${
                  isAdded(q._id)
                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                    : 'bg-primary-50 text-primary-700 hover:bg-primary-100'
                }`}
              >
                {isAdded(q._id) ? '✕ Remove' : '+ Add'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Selected list */}
      {selectedQuestions.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1.5">
            {selectedQuestions.length} question{selectedQuestions.length !== 1 ? 's' : ''} in this test
          </p>
          <div className="border border-green-200 bg-green-50 rounded-lg divide-y divide-green-100 max-h-44 overflow-y-auto">
            {selectedQuestions.map((q, i) => {
              const id = q._id ?? q;
              const text = q.questionText?.en ?? q.questionText ?? `Question ${i + 1}`;
              return (
                <div key={id} className="flex items-center gap-3 px-3 py-2">
                  <span className="w-6 text-center text-xs text-gray-400">{i + 1}</span>
                  <p className="flex-1 text-sm text-gray-700 line-clamp-1">{text}</p>
                  <button
                    type="button"
                    onClick={() => onRemove(id)}
                    className="text-xs text-red-500 hover:text-red-700 flex-shrink-0"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Test Form ─────────────────────────────────────────────────────────────────
function LiveTestForm({ form, setForm, onSubmit, loading }) {
  const input = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));
  const setBi = (field, lang, val) =>
    setForm((p) => ({ ...p, [field]: { ...p[field], [lang]: val } }));

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Title */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Title (English) *</label>
          <input className={input} value={form.title.en} onChange={(e) => setBi('title', 'en', e.target.value)} required />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Title (Hindi)</label>
          <input className={input} value={form.title.hi} onChange={(e) => setBi('title', 'hi', e.target.value)} />
        </div>
      </div>

      {/* Description */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Description (English)</label>
          <textarea className={`${input} resize-none`} rows={2} value={form.description.en} onChange={(e) => setBi('description', 'en', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Description (Hindi)</label>
          <textarea className={`${input} resize-none`} rows={2} value={form.description.hi} onChange={(e) => setBi('description', 'hi', e.target.value)} />
        </div>
      </div>

      {/* Row: category, schedule, duration */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Exam Category *</label>
          <select className={input} value={form.examCategory} onChange={(e) => set('examCategory', e.target.value)}>
            {EXAM_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Scheduled Date & Time *</label>
          <input
            type="datetime-local"
            className={input}
            value={form.scheduledAt}
            onChange={(e) => set('scheduledAt', e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Duration (minutes) *</label>
          <input
            type="number"
            className={input}
            min={1}
            value={form.durationMinutes}
            onChange={(e) => set('durationMinutes', Number(e.target.value))}
            required
          />
        </div>
      </div>

      {/* Row: total marks, negative marking */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Total Marks</label>
          <input
            type="number"
            className={input}
            min={0}
            value={form.totalMarks}
            onChange={(e) => set('totalMarks', Number(e.target.value))}
          />
          <p className="text-xs text-gray-400 mt-0.5">0 = 1 mark per question</p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Negative Marking</label>
          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              id="neg-mark"
              checked={form.negativeMarking}
              onChange={(e) => set('negativeMarking', e.target.checked)}
              className="w-4 h-4 accent-primary-600"
            />
            <label htmlFor="neg-mark" className="text-sm text-gray-700">Enable</label>
          </div>
        </div>
        {form.negativeMarking && (
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Penalty per wrong</label>
            <input
              type="number"
              className={input}
              step={0.25}
              min={0}
              max={1}
              value={form.negativeMarkValue}
              onChange={(e) => set('negativeMarkValue', Number(e.target.value))}
            />
          </div>
        )}
      </div>

      {/* Questions */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-2">
          Questions ({form.questions.length} added)
        </label>
        <QuestionPicker
          selectedQuestions={form.questions}
          onAdd={(q) => !form.questions.find((x) => (x._id ?? x) === q._id) && set('questions', [...form.questions, q])}
          onRemove={(id) => set('questions', form.questions.filter((q) => (q._id ?? q) !== id))}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <button type="submit" disabled={loading} className="px-6 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50">
          {loading ? 'Saving…' : 'Save Live Test'}
        </button>
      </div>
    </form>
  );
}

// ── Status badge helper ───────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    upcoming: 'bg-blue-50 text-blue-700',
    live:     'bg-red-50 text-red-600',
    ended:    'bg-green-50 text-green-700',
  };
  const labels = { upcoming: '📅 Upcoming', live: '🔴 Live', ended: '✅ Ended' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {labels[status] ?? status}
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LiveTests() {
  const { showToast } = useToast();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [statusModal, setStatusModal] = useState(null); // { test, newStatus }

  const fetchTests = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await liveTestsAPI.list({ status: statusFilter || undefined, limit: 100 });
      setTests(data.data ?? []);
    } catch {
      showToast('Failed to load live tests', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchTests(); }, [fetchTests]);

  // ── Open create form ──
  const openCreate = () => {
    setEditingTest(null);
    // Default scheduledAt to tomorrow 10am IST
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    // datetime-local format: YYYY-MM-DDTHH:mm
    const pad = (n) => String(n).padStart(2, '0');
    const dt = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T10:00`;
    setForm({ ...EMPTY_FORM, scheduledAt: dt });
    setShowForm(true);
  };

  // ── Open edit form ──
  const openEdit = async (test) => {
    setEditingTest(test);
    // Fetch full test with questions populated
    try {
      const { data } = await liveTestsAPI.getById(test._id);
      const t = data.data?.test ?? data.data ?? test;
      const d = new Date(t.scheduledAt);
      const pad = (n) => String(n).padStart(2, '0');
      const dt = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      setForm({
        title:             t.title ?? { en: '', hi: '' },
        description:       t.description ?? { en: '', hi: '' },
        examCategory:      t.examCategory ?? 'ssc',
        scheduledAt:       dt,
        durationMinutes:   Math.round((t.durationSeconds ?? 1800) / 60),
        totalMarks:        t.totalMarks ?? 0,
        negativeMarking:   t.negativeMarking ?? false,
        negativeMarkValue: t.negativeMarkValue ?? 0.25,
        questions:         t.questions ?? [],
      });
    } catch {
      showToast('Could not load test details', 'error');
    }
    setShowForm(true);
  };

  // ── Submit form ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.scheduledAt) return showToast('Scheduled date/time is required', 'error');

    setSaving(true);
    try {
      const payload = {
        ...form,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        durationSeconds: form.durationMinutes * 60,
        questions: form.questions.map((q) => q._id ?? q),
      };
      delete payload.durationMinutes;

      if (editingTest) {
        await liveTestsAPI.update(editingTest._id, payload);
        showToast('Live test updated', 'success');
      } else {
        await liveTestsAPI.create(payload);
        showToast('Live test created', 'success');
      }
      setShowForm(false);
      fetchTests();
    } catch (err) {
      showToast(err?.response?.data?.message ?? 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Status change ──
  const handleStatusChange = async () => {
    if (!statusModal) return;
    try {
      await liveTestsAPI.setStatus(statusModal.test._id, statusModal.newStatus);
      showToast(`Status changed to ${statusModal.newStatus}`, 'success');
      setStatusModal(null);
      fetchTests();
    } catch (err) {
      showToast(err?.response?.data?.message ?? 'Status change failed', 'error');
    }
  };

  // ── Delete ──
  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await liveTestsAPI.remove(confirmDelete._id);
      showToast('Live test deleted', 'success');
      setConfirmDelete(null);
      fetchTests();
    } catch (err) {
      showToast(err?.response?.data?.message ?? 'Delete failed', 'error');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🔴 Live Tests</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create and manage scheduled live tests with questions</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          + New Live Test
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5">
        {['', 'upcoming', 'live', 'ended'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              statusFilter === s
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
            }`}
          >
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : tests.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🔴</p>
          <p className="text-gray-500 font-medium">No live tests yet</p>
          <p className="text-sm text-gray-400 mt-1">Create your first live test to get started</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Title</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Scheduled</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Duration</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Questions</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tests.map((test) => {
                const scheduled = new Date(test.scheduledAt);
                const durationMin = Math.round((test.durationSeconds ?? 0) / 60);
                return (
                  <tr key={test._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 line-clamp-1 max-w-xs">{test.title?.en ?? '—'}</p>
                      {test.title?.hi && <p className="text-xs text-gray-400 line-clamp-1">{test.title.hi}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="uppercase text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {test.examCategory}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                      <div>{scheduled.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                      <div className="text-gray-400">{scheduled.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{durationMin} min</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${(test.questions?.length ?? 0) === 0 ? 'text-red-500' : 'text-green-600'}`}>
                        {test.questions?.length ?? 0}
                      </span>
                      {(test.questions?.length ?? 0) === 0 && (
                        <span className="ml-1 text-xs text-red-400">⚠️ None added</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={test.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        {/* Status toggle */}
                        {test.status !== 'ended' && (
                          <select
                            value={test.status}
                            onChange={(e) => setStatusModal({ test, newStatus: e.target.value })}
                            className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 bg-white"
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                            ))}
                          </select>
                        )}
                        <button
                          onClick={() => openEdit(test)}
                          className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg text-primary-600 hover:bg-primary-50"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => setConfirmDelete(test)}
                          className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg text-red-500 hover:bg-red-50"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editingTest ? `Edit: ${editingTest.title?.en ?? 'Live Test'}` : 'Create Live Test'}
        size="xl"
      >
        <LiveTestForm form={form} setForm={setForm} onSubmit={handleSubmit} loading={saving} />
      </Modal>

      {/* Status confirm */}
      {statusModal && (
        <ConfirmModal
          open
          onClose={() => setStatusModal(null)}
          onConfirm={handleStatusChange}
          title="Change Status"
          message={`Change status of "${statusModal.test.title?.en}" to "${statusModal.newStatus}"?`}
        />
      )}

      {/* Delete confirm */}
      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete Live Test"
        message={`Are you sure you want to delete "${confirmDelete?.title?.en}"? This cannot be undone.`}
        danger
      />
    </div>
  );
}
