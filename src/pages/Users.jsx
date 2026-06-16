import { useState, useEffect, useCallback } from 'react';
import { usersAPI } from '../api/client';
import { ConfirmModal } from '../components/Modal';
import { useToast } from '../components/Toast';

function Avatar({ name }) {
  return (
    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-sm font-bold text-primary-700 flex-shrink-0">
      {name?.[0]?.toUpperCase() ?? '?'}
    </div>
  );
}

export default function Users() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [actionTarget, setActionTarget] = useState(null); // { user, action: 'suspend'|'unsuspend'|'makeAdmin'|'removeAdmin' }
  const [actioning, setActioning] = useState(false);

  const LIMIT = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (search) params.search = search;
      if (filterStatus === 'suspended') params.isSuspended = true;
      else if (filterStatus === 'active') params.isSuspended = false;
      const { data } = await usersAPI.list(params);
      setUsers(data.data?.users ?? data.data ?? []);
      setTotal(data.data?.total ?? data.total ?? 0);
    } catch {
      toast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async () => {
    if (!actionTarget) return;
    setActioning(true);
    try {
      const { action, user } = actionTarget;
      if (action === 'suspend') {
        await usersAPI.suspend(user._id);
        toast(`${user.name} suspended`, 'warning');
      } else if (action === 'unsuspend') {
        await usersAPI.unsuspend(user._id);
        toast(`${user.name} unsuspended`);
      } else if (action === 'makeAdmin') {
        await usersAPI.updateRole(user._id, 'admin');
        toast(`${user.name} is now an admin`);
      } else if (action === 'removeAdmin') {
        await usersAPI.updateRole(user._id, 'user');
        toast(`${user.name} admin access removed`, 'warning');
      }
      setActionTarget(null);
      load();
    } catch (err) {
      toast(err?.response?.data?.message ?? 'Action failed', 'error');
    } finally {
      setActioning(false);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString()} registered</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="search"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-64"
        />
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No users found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Joined</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Streak</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Role</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-40 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} />
                      <div className="min-w-0">
                        <div className="font-medium text-gray-800 truncate">{u.name ?? '—'}</div>
                        <div className="text-xs text-gray-400 truncate">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.currentStreak ?? 0} 🔥</td>
                  <td className="px-4 py-3">
                    {u.role === 'superadmin' ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">superadmin</span>
                    ) : u.role === 'admin' ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">admin</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">user</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium w-fit ${
                        u.isSuspended ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {u.isSuspended ? 'suspended' : 'active'}
                      </span>
                      {!u.isEmailVerified && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 w-fit">
                          unverified
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Admin toggle — only for non-superadmin users */}
                      {u.role !== 'superadmin' && (
                        u.role === 'admin' ? (
                          <button
                            onClick={() => setActionTarget({ user: u, action: 'removeAdmin' })}
                            className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                          >
                            Remove Admin
                          </button>
                        ) : (
                          <button
                            onClick={() => setActionTarget({ user: u, action: 'makeAdmin' })}
                            className="px-2 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                          >
                            Make Admin
                          </button>
                        )
                      )}
                      {/* Suspend toggle */}
                      {u.isSuspended ? (
                        <button
                          onClick={() => setActionTarget({ user: u, action: 'unsuspend' })}
                          className="px-2 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                        >
                          Unsuspend
                        </button>
                      ) : (
                        <button
                          onClick={() => setActionTarget({ user: u, action: 'suspend' })}
                          className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          Suspend
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">← Prev</button>
            <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">Next →</button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!actionTarget}
        onClose={() => setActionTarget(null)}
        onConfirm={handleAction}
        title={
          actionTarget?.action === 'suspend' ? 'Suspend User' :
          actionTarget?.action === 'unsuspend' ? 'Unsuspend User' :
          actionTarget?.action === 'makeAdmin' ? 'Grant Admin Access' :
          'Remove Admin Access'
        }
        message={
          actionTarget?.action === 'suspend'
            ? `Suspend ${actionTarget?.user?.name}? They won't be able to log in.`
          : actionTarget?.action === 'unsuspend'
            ? `Unsuspend ${actionTarget?.user?.name}? They'll regain access.`
          : actionTarget?.action === 'makeAdmin'
            ? `Grant admin access to ${actionTarget?.user?.name}? They can manage content.`
          : `Remove admin access from ${actionTarget?.user?.name}?`
        }
        danger={actionTarget?.action === 'suspend' || actionTarget?.action === 'removeAdmin'}
        loading={actioning}
      />
    </div>
  );
}
