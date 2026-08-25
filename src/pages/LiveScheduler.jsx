/**
 * LiveScheduler.jsx — dedicated view for Live Classes.
 * Focused on the scheduling workflow: what's upcoming, what's live right
 * now, quick manual status control (the cron auto-transitions
 * upcoming→live, but "live→ended" is normally a manual admin action —
 * see video.service.js / liveClass.cron.js from Phase 2).
 */

import { useState, useEffect, useCallback } from 'react';
import { videosAPI } from '../api/client';
import { Modal, ConfirmModal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { VideoForm, EMPTY_VIDEO_FORM } from '../components/VideoForm';

function useCountdown(scheduledAt) {
  const [label, setLabel] = useState('');
  useEffect(() => {
    let id;
    const tick = () => {
      const diff = new Date(scheduledAt).getTime() - Date.now();
      if (diff <= 0) {
        setLabel('Starting…');
        // BUG FIX: this kept re-rendering every 30s forever once diff <= 0
        // (e.g. an admin leaving this tab open past the scheduled time) —
        // nothing left to count down, so stop the interval.
        clearInterval(id);
        return;
      }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      setLabel(h > 0 ? `in ${h}h ${m}m` : `in ${m}m`);
    };
    tick();
    id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [scheduledAt]);
  return label;
}

function LiveCard({ video, onEnd, onEdit }) {
  const countdown = useCountdown(video.scheduledAt);
  const isLive = video.liveStatus === 'live';
  return (
    <div className={`border rounded-xl overflow-hidden bg-white ${isLive ? 'border-red-300 ring-1 ring-red-200' : 'border-gray-200'}`}>
      <div className="w-full h-32 bg-gray-100 flex items-center justify-center overflow-hidden">
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
          />
        ) : null}
        <div className="text-xs text-gray-400" style={{ display: video.thumbnailUrl ? 'none' : 'block' }}>No thumbnail</div>
      </div>
      <div className="p-4">
      <div className="flex items-start justify-between mb-2">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isLive ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
          {isLive ? '🔴 LIVE NOW' : `📅 Upcoming ${countdown}`}
        </span>
        <span className="text-xs text-gray-400 capitalize">{video.accessType}</span>
      </div>
      <p className="font-semibold text-gray-900 line-clamp-2">{video.title?.en}</p>
      <p className="text-xs text-gray-400 mt-1">{video.teacher?.name ?? 'No teacher assigned'}</p>
      <p className="text-xs text-gray-500 mt-1">
        {new Date(video.scheduledAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
      </p>
      <div className="flex gap-2 mt-3">
        <button onClick={() => onEdit(video)} className="flex-1 text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
          Edit
        </button>
        {isLive && (
          <button onClick={() => onEnd(video)} className="flex-1 text-xs px-2.5 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700">
            End Live
          </button>
        )}
      </div>
      </div>
    </div>
  );
}

export default function LiveScheduler() {
  const toast = useToast();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('upcoming'); // upcoming | live | ended

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_VIDEO_FORM, type: 'live' });
  const [saving, setSaving] = useState(false);
  const [endTarget, setEndTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await videosAPI.list({ type: 'live', liveStatus: tab, limit: 50 });
      setVideos(data.data ?? []);
    } catch {
      toast('Failed to load live classes', 'error');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ ...EMPTY_VIDEO_FORM, type: 'live' });
    setModalOpen(true);
  };

  const openEdit = (v) => {
    setEditTarget(v);
    const d = new Date(v.scheduledAt);
    const pad = (n) => String(n).padStart(2, '0');
    setForm({
      title: v.title ?? { en: '', hi: '' },
      description: v.description ?? { en: '', hi: '' },
      thumbnailUrl: v.thumbnailUrl ?? '',
      type: 'live',
      youtubeVideoId: '',
      youtubeLiveId: v.youtubeLiveId ?? '',
      durationSeconds: '',
      scheduledAt: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
      teacher: v.teacher?._id ?? v.teacher ?? '',
      playlist: '',
      examTags: v.examTags ?? [],
      accessType: v.accessType ?? 'public',
      allowedBatches: (v.allowedBatches ?? []).map((b) => b._id ?? b),
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, scheduledAt: new Date(form.scheduledAt).toISOString() };
      delete payload.youtubeVideoId;
      delete payload.durationSeconds;
      delete payload.playlist;
      if (payload.accessType !== 'batch') delete payload.allowedBatches;

      if (editTarget) {
        await videosAPI.update(editTarget._id, payload);
        toast('Live class updated');
        setModalOpen(false);
      } else {
        const { data } = await videosAPI.create(payload);
        // New live classes start as draft, same as recorded — publish immediately
        // so it actually shows up for students once scheduledAt arrives.
        //
        // BUG FIX: create-then-publish is two sequential calls. If publish
        // failed after create succeeded, this used to fall into the catch
        // below and show a generic "Save failed" toast — misleading, since
        // the class WAS created, just left as an invisible unpublished
        // draft with no obvious next step for the admin. Now the two steps
        // are handled separately: a publish failure gets its own message
        // telling the admin exactly what state it's in and how to fix it,
        // instead of implying nothing happened.
        try {
          await videosAPI.publish(data.data.video._id);
          toast('Live class scheduled');
        } catch (publishErr) {
          toast(
            'Class was created but publishing failed — find it under Videos (status: draft) and click Publish to make it visible to students.',
            'error'
          );
        }
        setModalOpen(false);
      }
      load();
    } catch (err) {
      toast(err?.response?.data?.message ?? 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEnd = async () => {
    if (!endTarget) return;
    try {
      await videosAPI.setLiveStatus(endTarget._id, 'ended');
      toast('Live class ended');
      setEndTarget(null);
      load();
    } catch (err) {
      toast(err?.response?.data?.message ?? 'Failed to end live class', 'error');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📡 Live Scheduler</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Classes auto-go-live at their scheduled time. You end them manually when the stream finishes.
          </p>
        </div>
        <button onClick={openCreate} className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700">
          + Schedule Live Class
        </button>
      </div>

      <div className="flex gap-2 mb-5">
        {['upcoming', 'live', 'ended'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              tab === t ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : videos.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📡</p>
          <p className="text-gray-500 font-medium">No {tab} live classes</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((v) => (
            <LiveCard key={v._id} video={v} onEdit={openEdit} onEnd={setEndTarget} />
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Edit Live Class' : 'Schedule Live Class'} size="lg">
        <VideoForm form={form} setForm={setForm} onSubmit={handleSubmit} loading={saving} lockType="live" />
      </Modal>

      <ConfirmModal
        open={!!endTarget}
        onClose={() => setEndTarget(null)}
        onConfirm={handleEnd}
        title="End Live Class"
        message={`Mark "${endTarget?.title?.en}" as ended? Students will no longer see it as live.`}
      />
    </div>
  );
}
