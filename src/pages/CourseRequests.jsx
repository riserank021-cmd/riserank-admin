/**
 * CourseRequests.jsx — single queue of pending access requests across every
 * private course, so an admin doesn't have to hunt through each course
 * individually. Approve/deny writes straight to Playlist.accessRequests via
 * PUT /playlists/:id/requests/:userId (see playlist.service.js).
 */

import { useState, useEffect, useCallback } from 'react';
import { playlistsAPI } from '../api/client';
import { useToast } from '../components/Toast';

export default function CourseRequests() {
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState(null); // `${playlistId}:${userId}` while a decision is in flight
  const [bulkActingOn, setBulkActingOn] = useState(null); // playlistId while "Approve all" is in flight

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await playlistsAPI.pendingRequests();
      setRequests(data.data ?? []);
    } catch {
      toast('Failed to load access requests', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const respond = async (playlistId, userId, decision) => {
    const key = `${playlistId}:${userId}`;
    setActingOn(key);
    try {
      await playlistsAPI.respondToRequest(playlistId, userId, decision);
      toast(decision === 'approved' ? 'Access approved' : 'Access denied');
      setRequests((prev) => prev.filter((r) => !(r.playlistId === playlistId && r.user?._id === userId)));
    } catch (err) {
      toast(err?.response?.data?.message ?? 'Action failed', 'error');
    } finally {
      setActingOn(null);
    }
  };

  // No bulk endpoint exists on the backend — this fires the same per-user
  // approve call for everyone waiting on one course, one request at a time,
  // so a partial failure only leaves the failed user still in the queue
  // instead of silently losing track of who was actually approved.
  const approveAll = async (playlistId, group) => {
    setBulkActingOn(playlistId);
    let succeeded = 0;
    let failed = 0;
    for (const r of group) {
      const userId = r.user?._id;
      // eslint-disable-next-line no-await-in-loop -- intentionally sequential, see comment above
      try {
        await playlistsAPI.respondToRequest(playlistId, userId, 'approved');
        succeeded++;
        setRequests((prev) => prev.filter((req) => !(req.playlistId === playlistId && req.user?._id === userId)));
      } catch {
        failed++;
      }
    }
    setBulkActingOn(null);
    if (failed === 0) {
      toast(`Approved ${succeeded} request${succeeded === 1 ? '' : 's'}`);
    } else {
      toast(`Approved ${succeeded}, ${failed} failed — still in the queue`, 'error');
    }
  };

  // Group the flat request list by course so each course's queue can be
  // approved in one click instead of clicking through every student.
  const groups = requests.reduce((acc, r) => {
    if (!acc[r.playlistId]) acc[r.playlistId] = { playlistId: r.playlistId, title: r.playlistTitle, items: [] };
    acc[r.playlistId].items.push(r);
    return acc;
  }, {});
  const groupList = Object.values(groups);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">🔑 Course Requests</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Pending access requests for private courses. Approve to unlock the video list for that student.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-gray-500 font-medium">No pending requests</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groupList.map((group) => {
            const bulkBusy = bulkActingOn === group.playlistId;
            return (
              <div key={group.playlistId} className="border border-gray-200 rounded-xl bg-white overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{group.title?.en}</p>
                    <p className="text-xs text-gray-400">{group.items.length} pending request{group.items.length === 1 ? '' : 's'}</p>
                  </div>
                  {group.items.length > 1 && (
                    <button
                      disabled={bulkBusy || actingOn}
                      onClick={() => approveAll(group.playlistId, group.items)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
                    >
                      {bulkBusy ? 'Approving…' : `Approve all ${group.items.length}`}
                    </button>
                  )}
                </div>
                <div className="divide-y divide-gray-100">
                  {group.items.map((r) => {
                    const key = `${r.playlistId}:${r.user?._id}`;
                    const busy = actingOn === key;
                    return (
                      <div key={key} className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{r.user?.name ?? 'Unknown student'}</p>
                          <p className="text-xs text-gray-400">{r.user?.email}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {new Date(r.requestedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            disabled={busy || bulkBusy}
                            onClick={() => respond(r.playlistId, r.user?._id, 'denied')}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                          >
                            Deny
                          </button>
                          <button
                            disabled={busy || bulkBusy}
                            onClick={() => respond(r.playlistId, r.user?._id, 'approved')}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
                          >
                            {busy ? 'Saving…' : 'Approve'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
