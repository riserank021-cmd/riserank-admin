import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { videosAPI, playlistsAPI, teachersAPI, quizzesAPI, examsAPI, coachingCentersAPI } from '../api/client';
import { useAuth } from '../hooks/useAuth';

// Simple Coaching Admin dashboard (spec §22) — totals + recent content for
// their own center only, built entirely from existing list endpoints'
// pagination.total (no new analytics infra, per "no expensive analytics
// infra" instruction). Does NOT touch or reuse the Super Admin Dashboard.
function StatCard({ icon, label, value, to }) {
  const content = (
    <div className="bg-white rounded-xl border border-gray-200 p-5 h-full transition-shadow hover:shadow-md hover:border-gray-300">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg mb-3 bg-primary-50">{icon}</div>
      <div className="text-2xl font-bold text-gray-900">{value ?? '—'}</div>
      <div className="text-sm font-medium text-gray-700 mt-0.5">{label}</div>
    </div>
  );
  return to ? <Link to={to} className="block h-full">{content}</Link> : content;
}

export default function CoachingAdminDashboard() {
  const { admin } = useAuth();
  const ownCenterId = typeof admin?.coachingCenter === 'object' ? admin?.coachingCenter?._id : admin?.coachingCenter;

  const [center, setCenter] = useState(null);
  const [stats, setStats] = useState(null);
  const [recentVideos, setRecentVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ownCenterId) {
      setError('Your account is not linked to a coaching center yet. Contact your Super Admin.');
      setLoading(false);
      return;
    }

    const scoped = { limit: 1, coachingCenter: ownCenterId };

    Promise.all([
      coachingCentersAPI.getById(ownCenterId).catch(() => null),
      videosAPI.list(scoped).catch(() => null),
      playlistsAPI.list(scoped).catch(() => null),
      teachersAPI.list(scoped).catch(() => null),
      quizzesAPI.list(scoped).catch(() => null),
      examsAPI.list({ limit: 1, coachingCenter: ownCenterId }).catch(() => null),
      videosAPI.list({ limit: 5, coachingCenter: ownCenterId }).catch(() => null),
    ]).then(([centerRes, videosRes, playlistsRes, teachersRes, quizzesRes, examsRes, recentRes]) => {
      setCenter(centerRes?.data?.data?.coachingCenter ?? null);
      setStats({
        videos: videosRes?.data?.pagination?.total ?? 0,
        playlists: playlistsRes?.data?.pagination?.total ?? 0,
        teachers: teachersRes?.data?.pagination?.total ?? 0,
        quizzes: quizzesRes?.data?.pagination?.total ?? 0,
        exams: examsRes?.data?.pagination?.total ?? 0,
      });
      setRecentVideos(recentRes?.data?.data ?? []);
    }).finally(() => setLoading(false));
  }, [ownCenterId]);

  if (loading) {
    return <div className="p-6 text-center text-gray-400 text-sm">Loading…</div>;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-xl p-4 text-sm">⚠️ {error}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          {center && <p className="text-sm text-gray-500 mt-0.5">{center.name}{center.status !== 'ACTIVE' ? ` — ${center.status}` : ''}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <StatCard icon="🎬" label="Videos" value={stats?.videos} to="/videos" />
        <StatCard icon="📁" label="Courses" value={stats?.playlists} to="/playlists" />
        <StatCard icon="🧑‍🏫" label="Teachers" value={stats?.teachers} to="/teachers" />
        <StatCard icon="📝" label="Quizzes" value={stats?.quizzes} to="/quizzes" />
        <StatCard icon="🎯" label="Exams" value={stats?.exams} to="/exams" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-3">Recent Videos</h2>
        {recentVideos.length === 0 ? (
          <p className="text-sm text-gray-400">No videos yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentVideos.map((v) => (
              <div key={v._id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-gray-800 truncate">{v.title?.en ?? '—'}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${v.status === 'published' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {v.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
