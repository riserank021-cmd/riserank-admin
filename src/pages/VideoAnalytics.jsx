/**
 * VideoAnalytics.jsx — Phase 8. Engagement analytics for Video Classes:
 * views, watch time, completion, bookmarks, popular videos, daily views,
 * teacher & batch breakdowns. Mirrors pages/Analytics.jsx's card/bar/section
 * styling so the two analytics surfaces feel consistent, without sharing
 * code (no shared component file exists for these yet — same convention
 * as the rest of this admin panel).
 */

import { useState, useEffect, useCallback } from 'react';
import { videoAnalyticsAPI, teachersAPI, batchesAPI } from '../api/client';

function StatCard({ icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-base mb-2 ${color}`}>{icon}</div>
      <div className="text-2xl font-bold text-gray-900">{value ?? '—'}</div>
      <div className="text-xs font-medium text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function SimpleBar({ data, valueKey = 'views', labelKey = 'date', color = 'bg-primary-500' }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map((d) => d[valueKey] ?? 0), 1);
  return (
    <div className="space-y-2">
      {data.slice(-14).map((item, i) => {
        const val = item[valueKey] ?? 0;
        const pct = (val / max) * 100;
        return (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-20 text-gray-500 truncate flex-shrink-0">{item[labelKey]}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-2">
              <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
            </div>
            <span className="w-8 text-right font-medium text-gray-700">{val.toLocaleString()}</span>
          </div>
        );
      })}
    </div>
  );
}

function Section({ title, action, children, loading }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900 text-sm">{title}</h2>
        {action}
      </div>
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${60 + i * 8}%` }} />
          ))}
        </div>
      ) : children}
    </div>
  );
}

function fmtDuration(seconds) {
  if (!seconds) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const fmt = (n) => (n != null ? Number(n).toLocaleString() : '—');

export default function VideoAnalytics() {
  const [overview, setOverview] = useState(null);
  const [popular, setPopular] = useState([]);
  const [daily, setDaily] = useState([]);
  const [loading, setLoading] = useState(true);

  const [teachers, setTeachers] = useState([]);
  const [teacherId, setTeacherId] = useState('');
  const [teacherStats, setTeacherStats] = useState(null);
  const [teacherLoading, setTeacherLoading] = useState(false);

  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useState('');
  const [batchStats, setBatchStats] = useState(null);
  const [batchLoading, setBatchLoading] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      videoAnalyticsAPI.overview(),
      videoAnalyticsAPI.popular({ limit: 10 }),
      videoAnalyticsAPI.dailyViews({ days: 14 }),
      teachersAPI.list({ limit: 100 }),
      batchesAPI.list({ limit: 100 }),
    ]).then(([ov, pop, dv, t, b]) => {
      if (ov.status === 'fulfilled') setOverview(ov.value.data.data);
      if (pop.status === 'fulfilled') setPopular(pop.value.data.data ?? []);
      if (dv.status === 'fulfilled') setDaily(dv.value.data.data ?? []);
      if (t.status === 'fulfilled') setTeachers(t.value.data.data ?? []);
      if (b.status === 'fulfilled') setBatches(b.value.data.data ?? []);
    }).finally(() => setLoading(false));
  }, []);

  const loadTeacherStats = useCallback(async (id) => {
    if (!id) return setTeacherStats(null);
    setTeacherLoading(true);
    try {
      const { data } = await videoAnalyticsAPI.teacherAnalytics(id);
      setTeacherStats(data.data);
    } catch {
      setTeacherStats(null);
    } finally {
      setTeacherLoading(false);
    }
  }, []);

  const loadBatchStats = useCallback(async (id) => {
    if (!id) return setBatchStats(null);
    setBatchLoading(true);
    try {
      const { data } = await videoAnalyticsAPI.batchAnalytics(id);
      setBatchStats(data.data);
    } catch {
      setBatchStats(null);
    } finally {
      setBatchLoading(false);
    }
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-gray-900">🎥 Video Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Engagement across Video Classes — views, watch time, completion, bookmarks</p>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading ? (
          [...Array(7)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
              <div className="w-9 h-9 bg-gray-100 rounded-lg mb-2" />
              <div className="h-6 bg-gray-100 rounded w-16 mb-1" />
              <div className="h-3 bg-gray-100 rounded w-24" />
            </div>
          ))
        ) : overview ? (
          <>
            <StatCard icon="🎬" label="Total Videos"     value={fmt(overview.videoCount)}       color="bg-blue-50" />
            <StatCard icon="✅" label="Published"         value={fmt(overview.publishedCount)}   color="bg-green-50" />
            <StatCard icon="👁️" label="Total Views"       value={fmt(overview.totalViews)}       color="bg-purple-50" />
            <StatCard icon="⏱️" label="Total Watch Time"  value={fmtDuration(overview.totalWatchTimeSeconds)} color="bg-orange-50" />
            <StatCard icon="🏁" label="Completions"       value={fmt(overview.totalCompletions)} color="bg-pink-50" />
            <StatCard icon="📊" label="Completion Rate"   value={`${overview.overallCompletionRate ?? 0}%`} color="bg-cyan-50" />
            <StatCard icon="🔖" label="Bookmarks"         value={fmt(overview.totalBookmarks)}   color="bg-yellow-50" />
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Daily views */}
        <Section title="Daily Views (last 14 days)" loading={loading}>
          {daily.length === 0
            ? <p className="text-xs text-gray-400">No view data yet</p>
            : <SimpleBar data={daily} valueKey="views" labelKey="date" color="bg-blue-400" />}
        </Section>

        {/* Popular videos */}
        <Section title="Popular Videos (all-time)" loading={loading}>
          {popular.length === 0
            ? <p className="text-xs text-gray-400">No videos published yet</p>
            : (
              <div className="space-y-2">
                {popular.map((v, i) => (
                  <div key={v.videoId ?? i} className="flex items-center gap-3 text-xs">
                    <span className="w-5 text-center font-bold text-gray-400">#{i + 1}</span>
                    <span className="text-base">{v.type === 'live' ? '🔴' : '📼'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 truncate">{v.title?.en ?? '—'}</div>
                    </div>
                    <span className="font-semibold text-gray-700">{fmt(v.views)} views</span>
                  </div>
                ))}
              </div>
            )}
        </Section>

        {/* Teacher analytics */}
        <Section
          title="Teacher Analytics"
          loading={loading}
          action={
            <select
              value={teacherId}
              onChange={(e) => { setTeacherId(e.target.value); loadTeacherStats(e.target.value); }}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-300"
            >
              <option value="">Select a teacher…</option>
              {teachers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
            </select>
          }
        >
          {teacherLoading ? (
            <p className="text-xs text-gray-400">Loading…</p>
          ) : !teacherId ? (
            <p className="text-xs text-gray-400">Select a teacher to see their video performance</p>
          ) : !teacherStats ? (
            <p className="text-xs text-gray-400">No data</p>
          ) : (
            <div className="space-y-3 text-sm">
              {[
                ['Videos', `${fmt(teacherStats.videoCount)} (${fmt(teacherStats.publishedCount)} published)`],
                ['Total views', fmt(teacherStats.totalViews)],
                ['Unique viewers', fmt(teacherStats.uniqueViewers)],
                ['Watch time', fmtDuration(teacherStats.totalWatchTimeSeconds)],
                ['Completions', fmt(teacherStats.completions)],
                ['Bookmarks', fmt(teacherStats.bookmarks)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-gray-500">{k}</span>
                  <span className="font-semibold text-gray-900">{v}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Batch analytics */}
        <Section
          title="Batch Analytics"
          loading={loading}
          action={
            <select
              value={batchId}
              onChange={(e) => { setBatchId(e.target.value); loadBatchStats(e.target.value); }}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-300"
            >
              <option value="">Select a batch…</option>
              {batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          }
        >
          {batchLoading ? (
            <p className="text-xs text-gray-400">Loading…</p>
          ) : !batchId ? (
            <p className="text-xs text-gray-400">Select a batch to see engagement on its exclusive videos</p>
          ) : !batchStats ? (
            <p className="text-xs text-gray-400">No data</p>
          ) : batchStats.videoCount === 0 ? (
            <p className="text-xs text-gray-400">This batch has no batch-restricted videos yet</p>
          ) : (
            <div className="space-y-3 text-sm">
              {[
                ['Batch videos', fmt(batchStats.videoCount)],
                ['Total views', fmt(batchStats.totalViews)],
                ['Unique viewers', fmt(batchStats.uniqueViewers)],
                ['Watch time', fmtDuration(batchStats.totalWatchTimeSeconds)],
                ['Completions', fmt(batchStats.completions)],
                ['Bookmarks', fmt(batchStats.bookmarks)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-gray-500">{k}</span>
                  <span className="font-semibold text-gray-900">{v}</span>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
