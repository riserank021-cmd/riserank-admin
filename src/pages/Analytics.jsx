import { useState, useEffect } from 'react';
import { api } from '../api/client';

function StatCard({ icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-base mb-2 ${color}`}>{icon}</div>
      <div className="text-2xl font-bold text-gray-900">{value ?? '—'}</div>
      <div className="text-xs font-medium text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function SimpleBar({ data, label, color = 'bg-primary-500' }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => d.count ?? d.value ?? 0), 1);
  return (
    <div className="space-y-2">
      {data.slice(0, 10).map((item, i) => {
        const val = item.count ?? item.value ?? 0;
        const pct = (val / max) * 100;
        const lbl = item.date ?? item._id ?? item.label ?? `Item ${i + 1}`;
        return (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-24 text-gray-500 truncate flex-shrink-0">{String(lbl).slice(0, 10)}</span>
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

function Section({ title, children, loading }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="font-semibold text-gray-900 text-sm mb-4">{title}</h2>
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

export default function Analytics() {
  const [overview, setOverview]       = useState(null);
  const [dau, setDau]                 = useState([]);
  const [growth, setGrowth]           = useState([]);
  const [quizStats, setQuizStats]     = useState(null);
  const [topUsers, setTopUsers]       = useState([]);
  const [adminLogs, setAdminLogs]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');

  useEffect(() => {
    const calls = [
      api.get('/analytics/overview'),
      api.get('/analytics/dau'),
      api.get('/analytics/user-growth'),
      api.get('/analytics/quiz-stats'),
      api.get('/analytics/most-active-users'),
      api.get('/analytics/admin-logs'),
    ];

    Promise.allSettled(calls).then(([ov, dauRes, growthRes, qsRes, usersRes, logsRes]) => {
      // Check for a 403 on the overview call — that means no access at all
      if (ov.status === 'rejected' && ov.reason?.response?.status === 403) {
        setError('Analytics requires Super Admin access.');
      } else {
        if (ov.status       === 'fulfilled') setOverview(ov.value.data.data);
        if (dauRes.status   === 'fulfilled') setDau(dauRes.value.data.data ?? []);
        if (growthRes.status === 'fulfilled') setGrowth(growthRes.value.data.data ?? []);
        if (qsRes.status    === 'fulfilled') setQuizStats(qsRes.value.data.data);
        if (usersRes.status === 'fulfilled') setTopUsers(usersRes.value.data.data ?? []);
        if (logsRes.status  === 'fulfilled') setAdminLogs(logsRes.value.data.data ?? []);
      }
    }).finally(() => setLoading(false));
  }, []);

  const fmt = n => (n != null ? Number(n).toLocaleString() : '—');

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-amber-700 text-sm">
          ⚠️ {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Platform-wide metrics (Super Admin only)</p>
      </div>

      {/* Overview stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading ? (
          [...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
              <div className="w-9 h-9 bg-gray-100 rounded-lg mb-2" />
              <div className="h-6 bg-gray-100 rounded w-16 mb-1" />
              <div className="h-3 bg-gray-100 rounded w-24" />
            </div>
          ))
        ) : overview ? (
          <>
            <StatCard icon="👥" label="Total Users"     value={fmt(overview.totalUsers)}     color="bg-blue-50"   />
            <StatCard icon="📅" label="DAU Today"       value={fmt(overview.dau)}            color="bg-green-50"  />
            <StatCard icon="🎉" label="New Today"       value={fmt(overview.newUsersToday)}  color="bg-purple-50" />
            <StatCard icon="📝" label="Total Quizzes"   value={fmt(overview.totalQuizzes)}   color="bg-orange-50" />
            <StatCard icon="🎯" label="Attempts"        value={fmt(overview.totalAttempts)}  color="bg-pink-50"   />
            <StatCard icon="❓" label="Questions"       value={fmt(overview.totalQuestions)} color="bg-cyan-50"   />
            <StatCard icon="📰" label="Current Affairs" value={fmt(overview.totalAffairs)}   color="bg-yellow-50" />
            <StatCard icon="🚩" label="Pending Reports" value={fmt(overview.pendingReports)} color="bg-red-50"    />
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* DAU */}
        <Section title="Daily Active Users (last 30 days)" loading={loading}>
          {dau.length === 0
            ? <p className="text-xs text-gray-400">No data yet</p>
            : <SimpleBar data={dau} color="bg-blue-400" />
          }
        </Section>

        {/* User growth */}
        <Section title="New Registrations (last 30 days)" loading={loading}>
          {growth.length === 0
            ? <p className="text-xs text-gray-400">No data yet</p>
            : <SimpleBar data={growth} color="bg-green-400" />
          }
        </Section>

        {/* Quiz stats */}
        <Section title="Quiz Performance" loading={loading}>
          {quizStats ? (
            <div className="space-y-3 text-sm">
              {[
                ['Total attempts',    fmt(quizStats.totalAttempts)],
                ['Avg. score',        quizStats.avgScore != null ? `${quizStats.avgScore.toFixed(1)}%` : '—'],
                ['Avg. time spent',   quizStats.avgDuration != null ? `${Math.round(quizStats.avgDuration)}s` : '—'],
                ['Completion rate',   quizStats.completionRate != null ? `${quizStats.completionRate.toFixed(1)}%` : '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-gray-500">{k}</span>
                  <span className="font-semibold text-gray-900">{v}</span>
                </div>
              ))}
            </div>
          ) : !loading && <p className="text-xs text-gray-400">No quiz data</p>}
        </Section>

        {/* Most active users */}
        <Section title="Most Active Users" loading={loading}>
          {topUsers.length === 0
            ? <p className="text-xs text-gray-400">No data yet</p>
            : (
              <div className="space-y-2">
                {topUsers.slice(0, 8).map((u, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs">
                    <span className="w-5 text-center font-bold text-gray-400">#{i + 1}</span>
                    <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xs flex-shrink-0">
                      {(u.name?.[0] ?? u.email?.[0] ?? '?').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 truncate">{u.name ?? u.email}</div>
                    </div>
                    <span className="font-semibold text-gray-700">{fmt(u.count ?? u.sessions)} sessions</span>
                  </div>
                ))}
              </div>
            )}
        </Section>
      </div>

      {/* Admin activity log */}
      <Section title="Recent Admin Activity" loading={loading}>
        {adminLogs.length === 0
          ? <p className="text-xs text-gray-400">No activity logs</p>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-100">
                    <th className="pb-2 font-medium">Admin</th>
                    <th className="pb-2 font-medium">Action</th>
                    <th className="pb-2 font-medium">Entity</th>
                    <th className="pb-2 font-medium text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {adminLogs.slice(0, 15).map((log, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="py-2 font-medium text-gray-800 truncate max-w-[100px]">{log.adminName ?? log.admin ?? '—'}</td>
                      <td className="py-2 text-gray-600">{log.action ?? '—'}</td>
                      <td className="py-2 text-gray-400 font-mono truncate max-w-[80px]">{log.entityType ?? '—'}</td>
                      <td className="py-2 text-gray-400 text-right whitespace-nowrap">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Section>
    </div>
  );
}
