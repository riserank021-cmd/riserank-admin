/**
 * VideoDashboard.jsx — Video Classes overview.
 * Counts are derived from `pagination.total` on lightweight (limit:1) list
 * calls rather than a dedicated stats endpoint — cheap, and avoids opening
 * a new backend surface just for counts. Real engagement aggregation (views,
 * watch time, completion, popular videos, teacher/batch breakdowns) lives on
 * the dedicated Video Analytics page (Phase 8), linked below.
 */

import { useState, useEffect } from 'react';
import { videosAPI } from '../api/client';
import { Link } from 'react-router-dom';

function Card({ icon, label, value, to, tone = 'gray' }) {
  const tones = {
    gray: 'bg-white border-gray-200',
    red: 'bg-red-50 border-red-200',
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
  };
  const content = (
    <div className={`border rounded-xl p-5 ${tones[tone]} hover:shadow-sm transition-shadow`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        {to && <span className="text-xs text-gray-400">View →</span>}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

async function count(params) {
  try {
    const { data } = await videosAPI.list({ ...params, limit: 1 });
    return data.pagination?.total ?? 0;
  } catch {
    return null;
  }
}

export default function VideoDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    (async () => {
      const [total, published, draft, recorded, live, upcoming, liveNow] = await Promise.all([
        count({}),
        count({ status: 'published' }),
        count({ status: 'draft' }),
        count({ type: 'recorded' }),
        count({ type: 'live' }),
        count({ type: 'live', liveStatus: 'upcoming' }),
        count({ type: 'live', liveStatus: 'live' }),
      ]);
      setStats({ total, published, draft, recorded, live, upcoming, liveNow });
    })();
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">🎥 Video Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Overview of Video Classes across the platform</p>
      </div>

      {stats?.liveNow > 0 && (
        <div className="mb-5 border border-red-300 bg-red-50 rounded-xl p-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-red-700">🔴 {stats.liveNow} class{stats.liveNow !== 1 ? 'es' : ''} live right now</p>
          <Link to="/live-scheduler" className="text-xs font-semibold text-red-700 underline">Go to Live Scheduler →</Link>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <Card icon="🎬" label="Total Videos" value={stats?.total} to="/videos" />
        <Card icon="✅" label="Published" value={stats?.published} to="/videos" tone="green" />
        <Card icon="📝" label="Draft" value={stats?.draft} to="/videos" />
        <Card icon="📼" label="Recorded" value={stats?.recorded} to="/videos" />
        <Card icon="🔴" label="Live Classes (total)" value={stats?.live} to="/live-scheduler" />
        <Card icon="📅" label="Upcoming Live" value={stats?.upcoming} to="/live-scheduler" tone="blue" />
        <Card icon="🔴" label="Live Right Now" value={stats?.liveNow} to="/live-scheduler" tone="red" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <Link to="/videos" className="border border-gray-200 rounded-xl p-4 bg-white hover:border-primary-300 transition-colors">
          <p className="font-semibold text-gray-900 text-sm">🎬 Manage Videos</p>
          <p className="text-xs text-gray-500 mt-1">Create, edit, publish recorded & live videos</p>
        </Link>
        <Link to="/teachers" className="border border-gray-200 rounded-xl p-4 bg-white hover:border-primary-300 transition-colors">
          <p className="font-semibold text-gray-900 text-sm">🧑‍🏫 Manage Teachers</p>
          <p className="text-xs text-gray-500 mt-1">Instructors shown on video classes</p>
        </Link>
        <Link to="/batches" className="border border-gray-200 rounded-xl p-4 bg-white hover:border-primary-300 transition-colors">
          <p className="font-semibold text-gray-900 text-sm">👥 Manage Batches</p>
          <p className="text-xs text-gray-500 mt-1">Student groups that gate batch-only videos</p>
        </Link>
        <Link to="/video-analytics" className="border border-gray-200 rounded-xl p-4 bg-white hover:border-primary-300 transition-colors">
          <p className="font-semibold text-gray-900 text-sm">📈 Video Analytics</p>
          <p className="text-xs text-gray-500 mt-1">Views, watch time, completion, popular videos</p>
        </Link>
      </div>
    </div>
  );
}
