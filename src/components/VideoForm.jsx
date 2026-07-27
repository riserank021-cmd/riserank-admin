/**
 * VideoForm.jsx — shared create/edit form for a Video (recorded or live).
 * Used by both pages/Videos.jsx (recorded management) and
 * pages/LiveScheduler.jsx (live scheduling) so the two stay in sync instead
 * of drifting into two slightly-different forms.
 *
 * lockType: pass 'recorded' | 'live' to hide the type picker when a page is
 * dedicated to one type (e.g. Live Scheduler always creates type='live').
 */

import { useState, useEffect } from 'react';
import { teachersAPI, batchesAPI } from '../api/client';

const EXAM_CATEGORIES = [
  { value: 'ssc',      label: 'SSC' },
  { value: 'railway',  label: 'Railway' },
  { value: 'banking',  label: 'Banking' },
  { value: 'bihar_si', label: 'Bihar SI' },
];

export const EMPTY_VIDEO_FORM = {
  title:           { en: '', hi: '' },
  description:     { en: '', hi: '' },
  thumbnailUrl:    '',
  type:             'recorded',
  youtubeVideoId:  '',
  youtubeLiveId:   '',
  durationSeconds: '',
  scheduledAt:      '',   // datetime-local
  teacher:          '',
  playlist:         '',
  examTags:         [],
  accessType:       'public',
  allowedBatches:   [],
};

const input = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';
const label = 'block text-xs font-semibold text-gray-600 mb-1';

export function VideoForm({ form, setForm, onSubmit, loading, lockType }) {
  const [teachers, setTeachers] = useState([]);
  const [batches, setBatches] = useState([]);

  useEffect(() => {
    teachersAPI.list({ limit: 100 }).then(({ data }) => setTeachers(data.data ?? [])).catch(() => {});
    batchesAPI.list({ limit: 100, isActive: true }).then(({ data }) => setBatches(data.data ?? [])).catch(() => {});
  }, []);

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));
  const setBi = (field, lang, val) => setForm((p) => ({ ...p, [field]: { ...p[field], [lang]: val } }));
  const toggleExamTag = (val) =>
    set('examTags', form.examTags.includes(val) ? form.examTags.filter((t) => t !== val) : [...form.examTags, val]);
  const toggleBatch = (id) =>
    set('allowedBatches', form.allowedBatches.includes(id) ? form.allowedBatches.filter((b) => b !== id) : [...form.allowedBatches, id]);

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Title */}
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

      {/* Description */}
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

      <div>
        <label className={label}>Thumbnail URL</label>
        <input className={input} value={form.thumbnailUrl} onChange={(e) => set('thumbnailUrl', e.target.value)} placeholder="https://…" />
      </div>

      {/* Type — hidden when the page locks it */}
      {!lockType && (
        <div>
          <label className={label}>Type *</label>
          <div className="flex gap-4">
            {['recorded', 'live'].map((t) => (
              <label key={t} className="flex items-center gap-2 text-sm text-gray-700">
                <input type="radio" name="type" checked={form.type === t} onChange={() => set('type', t)} className="accent-primary-600" />
                {t === 'recorded' ? 'Recorded (YouTube unlisted)' : 'Live (YouTube Live)'}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Recorded-only fields */}
      {form.type === 'recorded' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>YouTube Video ID (unlisted) *</label>
            <input
              className={input}
              value={form.youtubeVideoId}
              onChange={(e) => set('youtubeVideoId', e.target.value)}
              placeholder="e.g. dQw4w9WgXcQ"
              required
            />
            <p className="text-xs text-gray-400 mt-0.5">Just the ID, never the full URL — students never see this.</p>
          </div>
          <div>
            <label className={label}>Duration (seconds)</label>
            <input type="number" className={input} min={0} value={form.durationSeconds} onChange={(e) => set('durationSeconds', e.target.value)} />
          </div>
        </div>
      )}

      {/* Live-only fields */}
      {form.type === 'live' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>YouTube Live Video ID *</label>
            <input
              className={input}
              value={form.youtubeLiveId}
              onChange={(e) => set('youtubeLiveId', e.target.value)}
              placeholder="e.g. jfKfPfyJRdk"
              required
            />
          </div>
          <div>
            <label className={label}>Scheduled Date & Time *</label>
            <input type="datetime-local" className={input} value={form.scheduledAt} onChange={(e) => set('scheduledAt', e.target.value)} required />
          </div>
        </div>
      )}

      {/* Teacher / Playlist */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Teacher</label>
          <select className={input} value={form.teacher} onChange={(e) => set('teacher', e.target.value)}>
            <option value="">— None —</option>
            {teachers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Exam Tags</label>
          <div className="flex flex-wrap gap-3 mt-2">
            {EXAM_CATEGORIES.map((c) => (
              <label key={c.value} className="flex items-center gap-1.5 text-xs text-gray-700">
                <input type="checkbox" checked={form.examTags.includes(c.value)} onChange={() => toggleExamTag(c.value)} className="accent-primary-600" />
                {c.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Access control — the important part */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <label className={label}>Who can view this video? *</label>
        <div className="flex gap-4 mb-3">
          {[
            { v: 'public',  l: 'Public — all logged-in students' },
            { v: 'batch',   l: 'Batch — only selected batches' },
            { v: 'premium', l: 'Premium (coming soon)' },
          ].map((o) => (
            <label key={o.v} className={`flex items-center gap-2 text-sm ${o.v === 'premium' ? 'text-gray-400' : 'text-gray-700'}`}>
              <input
                type="radio"
                name="accessType"
                disabled={o.v === 'premium'}
                checked={form.accessType === o.v}
                onChange={() => set('accessType', o.v)}
                className="accent-primary-600"
              />
              {o.l}
            </label>
          ))}
        </div>

        {form.accessType === 'batch' && (
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">
              Select batch(es) — students outside these will see a locked video, never the YouTube ID.
            </p>
            {batches.length === 0 ? (
              <p className="text-xs text-gray-400">No batches yet — create one under Batches first.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {batches.map((b) => (
                  <button
                    type="button"
                    key={b._id}
                    onClick={() => toggleBatch(b._id)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                      form.allowedBatches.includes(b._id)
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-primary-300'
                    }`}
                  >
                    {b.name} {form.allowedBatches.includes(b._id) ? '✓' : ''}
                  </button>
                ))}
              </div>
            )}
            {form.accessType === 'batch' && form.allowedBatches.length === 0 && (
              <p className="text-xs text-red-500 mt-2">⚠️ Select at least one batch, or no student will be able to unlock this video.</p>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <button
          type="submit"
          disabled={loading || (form.accessType === 'batch' && form.allowedBatches.length === 0)}
          className="px-6 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Save Video'}
        </button>
      </div>
    </form>
  );
}
