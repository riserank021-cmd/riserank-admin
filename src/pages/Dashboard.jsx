import { useState, useEffect } from 'react';
import { analyticsAPI } from '../api/client';

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg mb-3 ${color}`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value ?? '—'}</div>
      <div className="text-sm font-medium text-gray-700 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    analyticsAPI.overview()
      .then(({ data }) => setStats(data.data))
      .catch((err) => {
        if (err?.response?.status === 403) {
          setError('Analytics requires Super Admin role.');
        } else {
          setError('Could not load analytics.');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n) => (n != null ? n.toLocaleString() : '—');

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="w-10 h-10 bg-gray-100 rounded-lg mb-3" />
              <div className="h-7 bg-gray-100 rounded w-20 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-28" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-xl p-4 text-sm">
          ⚠️ {error}
        </div>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard icon="👥" label="Total Users"        value={fmt(stats.totalUsers)}        color="bg-blue-50"   />
            <StatCard icon="📅" label="DAU (today)"        value={fmt(stats.dau)}               color="bg-green-50"  />
            <StatCard icon="❓" label="Total Questions"    value={fmt(stats.totalQuestions)}    color="bg-purple-50" />
            <StatCard icon="📝" label="Total Quizzes"      value={fmt(stats.totalQuizzes)}      color="bg-orange-50" />
            <StatCard icon="🎯" label="Quiz Attempts"      value={fmt(stats.totalAttempts)}     color="bg-pink-50"   />
            <StatCard icon="📰" label="Current Affairs"    value={fmt(stats.totalAffairs)}      color="bg-cyan-50"   />
            <StatCard icon="🔖" label="Bookmarks"          value={fmt(stats.totalBookmarks)}    color="bg-yellow-50" />
            <StatCard icon="🚩" label="Pending Reports"    value={fmt(stats.pendingReports)}    color="bg-red-50"    />
          </div>

          {stats.newUsersToday != null && (
            <div className="bg-primary-50 border border-primary-100 rounded-xl p-4">
              <p className="text-primary-700 text-sm font-medium">
                🎉 <strong>{fmt(stats.newUsersToday)}</strong> new users registered today
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
