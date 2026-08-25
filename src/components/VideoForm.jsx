/**
 * VideoForm.jsx — shared create/edit form for a Video (recorded or live).
 * Used by both pages/Videos.jsx (recorded management) and
 * pages/LiveScheduler.jsx (live scheduling) so the two stay in sync instead
 * of drifting into two slightly-different forms.
 *
 * lockType: pass 'recorded' | 'live' to hide the type picker when a page is
 * dedicated to one type (e.g. Live Scheduler always creates type='live').
 */

import { useState, useEffect, useRef } from 'react';
import { teachersAPI, batchesAPI, examsAPI, coachingCentersAPI, uploadAPI } from '../api/client';
import { useAuth } from '../hooks/useAuth';

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
  exams:            [],   // Phase 8/9: dynamic Exam refs, additive alongside examTags
  accessType:       'public',
  allowedBatches:   [],
  coachingCenter:   '',   // admin/superadmin only — see the Coaching Center field below
};

const input = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';
const label = 'block text-xs font-semibold text-gray-600 mb-1';

export function VideoForm({ form, setForm, onSubmit, loading, lockType }) {
  const { isSuperAdmin, isAdminRole } = useAuth();
  const [teachers, setTeachers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [exams, setExams] = useState([]);
  const [centers, setCenters] = useState([]);
  const [thumbUploading, setThumbUploading] = useState(false);
  const [thumbError, setThumbError] = useState('');
  const thumbFileRef = useRef(null);

  const canPickCenter = isSuperAdmin || isAdminRole;

  useEffect(() => {
    teachersAPI.list({ limit: 100 }).then(({ data }) => setTeachers(data.data ?? [])).catch(() => {});
    batchesAPI.list({ limit: 100, isActive: true }).then(({ data }) => setBatches(data.data ?? [])).catch(() => {});
    examsAPI.list({ limit: 100, status: 'published' }).then(({ data }) => setExams(data.data ?? [])).catch(() => {});
    if (canPickCenter) {
      coachingCentersAPI.list({ limit: 100 }).then(({ data }) => setCenters(data.data ?? [])).catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ytIdForThumb = (form.type === 'live' ? form.youtubeLiveId : form.youtubeVideoId)?.trim();

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));
  const setBi = (field, lang, val) => setForm((p) => ({ ...p, [field]: { ...p[field], [lang]: val } }));
  const toggleBatch = (id) =>
    set('allowedBatches', form.allowedBatches.includes(id) ? form.allowedBatches.filter((b) => b !== id) : [...form.allowedBatches, id]);
  const toggleExam = (id) =>
    set('exams', form.exams.includes(id) ? form.exams.filter((e) => e !== id) : [...form.exams, id]);

  const handleThumbnailUpload = async (file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setThumbError('Only JPEG, PNG, or WebP images are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setThumbError('Image too large — max 5MB');
      return;
    }
    setThumbError('');
    setThumbUploading(true);
    try {
      const { data } = await uploadAPI.videoThumbnail(file);
      set('thumbnailUrl', data.data.url);
    } catch (err) {
      setThumbError(err?.response?.data?.message ?? 'Upload failed');
    } finally {
      setThumbUploading(false);
      if (thumbFileRef.current) thumbFileRef.current.value = '';
    }
  };

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
        <label className={label}>Thumbnail</label>
        <div className="flex gap-3 items-start">
          <div className="w-32 h-20 shrink-0 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
            {form.thumbnailUrl ? (
              <img
                src={form.thumbnailUrl}
                alt="Thumbnail preview"
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
              />
            ) : null}
            <div
              className="w-full h-full items-center justify-center text-[10px] text-gray-400 text-center px-1"
              style={{ display: form.thumbnailUrl ? 'none' : 'flex' }}
            >
              No preview
            </div>
          </div>
          <div className="flex-1">
            <div className="flex gap-2">
              <input
                className={input}
                value={form.thumbnailUrl}
                onChange={(e) => set('thumbnailUrl', e.target.value)}
                placeholder="https://… (auto-filled from the YouTube ID if left blank)"
              />
              <input
                ref={thumbFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleThumbnailUpload(e.target.files?.[0])}
              />
              <button
                type="button"
                disabled={thumbUploading}
                onClick={() => thumbFileRef.current?.click()}
                className="shrink-0 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {thumbUploading ? 'Uploading…' : '📤 Upload'}
              </button>
            </div>
            {thumbError && <p className="text-xs text-red-500 mt-1">{thumbError}</p>}
            <p className="text-xs text-gray-400 mt-1">
              Upload your own image, paste a URL, or leave blank to auto-use the YouTube thumbnail for the video/live ID below.
              {ytIdForThumb && !form.thumbnailUrl && (
                <>
                  {' '}
                  <button
                    type="button"
                    className="text-primary-600 hover:underline font-medium"
                    onClick={() => set('thumbnailUrl', `https://img.youtube.com/vi/${ytIdForThumb}/hqdefault.jpg`)}
                  >
                    Use it now
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
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

      {/* Teacher — this is now the primary way students browse videos
          ("Browse by Teacher" on the mobile app), so pick this carefully.
          The old Exam Tags checkboxes (SSC/Railway/Banking/Bihar SI) were
          removed here since the mobile app no longer filters by them. */}
      <div>
        <label className={label}>Teacher</label>
        <select className={input} value={form.teacher} onChange={(e) => set('teacher', e.target.value)}>
          <option value="">— None —</option>
          {teachers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
        </select>
        {!form.teacher && (
          <p className="text-xs text-amber-600 mt-1">⚠️ Without a teacher, this video won't appear under any "Browse by Teacher" card on the app.</p>
        )}
      </div>

      {/* Exams — dynamic catalog, additive alongside the legacy examTags
          static enum (kept elsewhere/unused in this form per the mobile
          app's current Browse-by-Teacher-only behavior, see comment above). */}
      <div>
        <label className={label}>Exams</label>
        {exams.length === 0 ? (
          <p className="text-xs text-gray-400">No exams available yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {exams.map((ex) => (
              <button
                type="button"
                key={ex._id}
                onClick={() => toggleExam(ex._id)}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                  form.exams.includes(ex._id)
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-primary-300'
                }`}
              >
                {ex.name} {form.exams.includes(ex._id) ? '✓' : ''}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Coaching Center — admin/superadmin only. A Coaching Admin can never
          see or set this: the backend's stampCoachingCenter middleware
          always forces it to their own center server-side regardless of
          what's sent, so hiding it here is UX-consistency, not the actual
          security boundary (per spec §25). */}
      {canPickCenter && (
        <div>
          <label className={label}>Coaching Center</label>
          <select className={input} value={form.coachingCenter} onChange={(e) => set('coachingCenter', e.target.value)}>
            <option value="">Global (RiseRank's own content)</option>
            {centers.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
      )}

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
