import { useState, useEffect } from 'react';
import { api, batchesAPI } from '../api/client';
import { useToast } from '../components/Toast';

const TYPES = [
  { value: 'all',      label: 'All Users',        icon: '📢', desc: 'Broadcast to every registered user' },
  { value: 'category', label: 'By Category',       icon: '📂', desc: 'Send to users interested in an exam category' },
  { value: 'batch',    label: 'By Batch',          icon: '🎓', desc: 'Send to all students in a specific batch' },
  { value: 'user',     label: 'Specific User',     icon: '👤', desc: 'Send to one user by their User ID' },
];

// Mirrors the backend's real EXAM_CATEGORIES enum (config/constants.js) and
// VideoForm.jsx's list — the old hardcoded subject list here (Science,
// History, ...) never matched any real user's preferredExams, so "By
// Category" broadcasts silently matched nobody.
const CATEGORIES = [
  { value: 'ssc',      label: 'SSC' },
  { value: 'railway',  label: 'Railway' },
  { value: 'banking',  label: 'Banking' },
  { value: 'bihar_si', label: 'Bihar SI' },
];

export default function Notifications() {
  const toast = useToast();
  const [type, setType] = useState('all');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('');
  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useState('');
  const [userId, setUserId] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (type !== 'batch' || batches.length) return;
    (async () => {
      try {
        const { data } = await batchesAPI.list({ limit: 100, isActive: true });
        setBatches(data.data ?? []);
      } catch {
        toast('Failed to load batches', 'error');
      }
    })();
  }, [type]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = async () => {
    if (!title.trim()) return toast('Title is required', 'error');
    if (!body.trim())  return toast('Message body is required', 'error');
    if (type === 'category' && !category) return toast('Select a category', 'error');
    if (type === 'batch' && !batchId) return toast('Select a batch', 'error');
    if (type === 'user' && !userId.trim()) return toast('Enter a User ID', 'error');

    setSending(true);
    try {
      const payload = { title, body };
      if (type === 'all') {
        await api.post('/notifications/broadcast', payload);
      } else if (type === 'category') {
        await api.post('/notifications/broadcast', { ...payload, examCategory: category });
      } else if (type === 'batch') {
        await api.post('/notifications/broadcast', { ...payload, batchId });
      } else {
        await api.post(`/notifications/user/${userId.trim()}`, payload);
      }
      toast('Notification sent successfully', 'success');
      setSent(true);
      setTitle('');
      setBody('');
      setCategory('');
      setBatchId('');
      setUserId('');
      setTimeout(() => setSent(false), 3000);
    } catch (err) {
      toast(err?.response?.data?.message ?? 'Failed to send notification', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Push Notifications</h1>
        <p className="text-sm text-gray-500 mt-0.5">Send FCM push notifications to users</p>
      </div>

      {/* Audience selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Audience</label>
        <div className="grid grid-cols-4 gap-3">
          {TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className={`p-3 rounded-xl border text-left transition-all ${
                type === t.value
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="text-xl mb-1">{t.icon}</div>
              <div className={`text-xs font-semibold ${type === t.value ? 'text-primary-700' : 'text-gray-800'}`}>
                {t.label}
              </div>
              <div className="text-xs text-gray-400 mt-0.5 leading-snug">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Conditional target fields */}
      {type === 'category' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Exam Category</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          >
            <option value="">Select a category…</option>
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      )}

      {type === 'batch' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
          <select
            value={batchId}
            onChange={e => setBatchId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          >
            <option value="">Select a batch…</option>
            {batches.map(b => (
              <option key={b._id} value={b._id}>
                {b.name} {typeof b.studentCount === 'number' ? `(${b.studentCount})` : ''}
              </option>
            ))}
          </select>
          {!batches.length && (
            <p className="text-xs text-gray-400 mt-1">No active batches found.</p>
          )}
        </div>
      )}

      {type === 'user' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
          <input
            value={userId}
            onChange={e => setUserId(e.target.value)}
            placeholder="MongoDB ObjectId of the user"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 font-mono"
          />
        </div>
      )}

      {/* Notification content */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4 mb-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={100}
            placeholder="e.g. Daily Quiz is Live! 🎯"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{title.length}/100</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Message <span className="text-red-500">*</span>
          </label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            maxLength={200}
            rows={3}
            placeholder="e.g. Today's GK quiz is ready. Tap to start and climb the leaderboard!"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{body.length}/200</p>
        </div>
      </div>

      {/* Preview */}
      {(title || body) && (
        <div className="mb-5 bg-gray-900 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Preview</p>
          <div className="bg-white rounded-lg p-3 flex gap-3 items-start">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center text-white text-lg flex-shrink-0">🏆</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-sm truncate">{title || 'Notification title'}</div>
              <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{body || 'Notification body'}</div>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handleSend}
        disabled={sending || sent}
        className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
          sent
            ? 'bg-green-500 text-white'
            : 'bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50'
        }`}
      >
        {sent ? '✅ Sent!' : sending ? 'Sending…' : `Send to ${
          type === 'all' ? 'All Users' : type === 'category' ? 'Category' : type === 'batch' ? 'Batch' : 'User'
        }`}
      </button>
    </div>
  );
}
