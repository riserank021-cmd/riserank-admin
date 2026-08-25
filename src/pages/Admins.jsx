import { useState, useEffect, useCallback } from 'react';
import { adminsAPI, coachingCentersAPI } from '../api/client';
import { Modal, ConfirmModal } from '../components/Modal';
import { useToast } from '../components/Toast';

// Super Admin only — create/update Admin & Coaching Admin accounts.
// GET /admin/admins only ever returns role=admin accounts (backend
// limitation, see admin.service.js's listAdmins comment) — Coaching Admin
// accounts are fetched per-center via GET /coaching-centers/:id/admins and
// flattened here into a second tab, not a separate unified list endpoint.
const input = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';
const label = 'block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5';

const EMPTY_CREATE_FORM = { name: '', email: '', password: '', role: 'admin', coachingCenter: '' };
const EMPTY_EDIT_FORM = { name: '', role: 'admin', coachingCenter: '', isActive: true };

function CreateForm({ form, setForm, centers, onSubmit, loading, error }) {
  const setField = (key, val) => setForm((p) => ({ ...p, [key]: val }));
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className={label}>Name *</label>
        <input required className={input} value={form.name} onChange={(e) => setField('name', e.target.value)} />
      </div>
      <div>
        <label className={label}>Email *</label>
        <input type="email" required className={input} value={form.email} onChange={(e) => setField('email', e.target.value)} />
      </div>
      <div>
        <label className={label}>Password *</label>
        <input type="password" required minLength={8} className={input} value={form.password}
          onChange={(e) => setField('password', e.target.value)}
          placeholder="At least 8 characters, upper/lowercase + a number" />
      </div>
      <div>
        <label className={label}>Role *</label>
        <select className={input} value={form.role} onChange={(e) => setField('role', e.target.value)}>
          <option value="admin">Admin</option>
          <option value="superadmin">Super Admin</option>
          <option value="coaching_admin">Coaching Admin</option>
        </select>
      </div>
      {form.role === 'coaching_admin' && (
        <div>
          <label className={label}>Coaching Center *</label>
          <select required className={input} value={form.coachingCenter} onChange={(e) => setField('coachingCenter', e.target.value)}>
            <option value="">Select a coaching center…</option>
            {centers.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
      )}
      {error && <div className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">{error}</div>}
      <div className="flex justify-end gap-3 pt-2">
        <button type="submit" disabled={loading}
          className="px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
          {loading ? 'Creating…' : 'Create Account'}
        </button>
      </div>
    </form>
  );
}

function EditForm({ form, setForm, centers, onSubmit, loading, error }) {
  const setField = (key, val) => setForm((p) => ({ ...p, [key]: val }));
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className={label}>Name</label>
        <input className={input} value={form.name} onChange={(e) => setField('name', e.target.value)} />
      </div>
      <div>
        <label className={label}>Role</label>
        <select className={input} value={form.role} onChange={(e) => setField('role', e.target.value)}>
          <option value="admin">Admin</option>
          <option value="superadmin">Super Admin</option>
          <option value="coaching_admin">Coaching Admin</option>
        </select>
      </div>
      {form.role === 'coaching_admin' && (
        <div>
          <label className={label}>Coaching Center *</label>
          <select required className={input} value={form.coachingCenter} onChange={(e) => setField('coachingCenter', e.target.value)}>
            <option value="">Select a coaching center…</option>
            {centers.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
      )}
      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input type="checkbox" checked={form.isActive} onChange={(e) => setField('isActive', e.target.checked)} className="accent-primary-600" />
        Active
      </label>
      {error && <div className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">{error}</div>}
      <div className="flex justify-end gap-3 pt-2">
        <button type="submit" disabled={loading}
          className="px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
          {loading ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}

export default function Admins() {
  const toast = useToast();
  const [tab, setTab] = useState('admins'); // 'admins' | 'coaching_admins'

  const [admins, setAdmins] = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(true);

  const [coachingAdmins, setCoachingAdmins] = useState([]);
  const [caLoading, setCaLoading] = useState(true);

  const [centers, setCenters] = useState([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState('');

  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadCenters = useCallback(async () => {
    try {
      const { data } = await coachingCentersAPI.list({ limit: 100 });
      setCenters(data.data ?? []);
      return data.data ?? [];
    } catch {
      return [];
    }
  }, []);

  const loadAdmins = useCallback(async () => {
    setAdminsLoading(true);
    try {
      const { data } = await adminsAPI.list({ limit: 100 });
      setAdmins(data.data ?? []);
    } catch (err) {
      if (err?.response?.status === 403) toast("You don't have permission to perform this action.", 'error');
      else toast('Failed to load admins', 'error');
    } finally {
      setAdminsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadCoachingAdmins = useCallback(async (centerList) => {
    setCaLoading(true);
    try {
      const list = centerList ?? centers;
      const results = await Promise.all(
        list.map((c) => coachingCentersAPI.listAdminsForCenter(c._id).then((r) => (r.data.data ?? []).map((a) => ({ ...a, _centerName: c.name }))))
      );
      setCoachingAdmins(results.flat());
    } catch (err) {
      if (err?.response?.status === 403) toast("You don't have permission to perform this action.", 'error');
      else toast('Failed to load coaching admins', 'error');
    } finally {
      setCaLoading(false);
    }
  }, [centers]);

  useEffect(() => {
    loadAdmins();
    loadCenters().then((c) => loadCoachingAdmins(c));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const reloadAll = () => {
    loadAdmins();
    loadCoachingAdmins();
  };

  const openCreate = () => {
    setCreateForm(EMPTY_CREATE_FORM);
    setCreateError('');
    setCreateOpen(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreateSaving(true);
    try {
      const payload = { name: createForm.name, email: createForm.email, password: createForm.password, role: createForm.role };
      if (createForm.role === 'coaching_admin') payload.coachingCenter = createForm.coachingCenter;
      await adminsAPI.create(payload);
      toast('Account created');
      setCreateOpen(false);
      reloadAll();
    } catch (err) {
      const status = err?.response?.status;
      if (status === 403) setCreateError("You don't have permission to perform this action.");
      else if (status === 409) setCreateError('Email already registered.');
      else setCreateError(err?.response?.data?.message ?? 'Failed to create account.');
    } finally {
      setCreateSaving(false);
    }
  };

  const openEdit = (item) => {
    setEditTarget(item);
    setEditForm({
      name: item.name ?? '',
      role: item.role ?? 'admin',
      coachingCenter: (typeof item.coachingCenter === 'object' ? item.coachingCenter?._id : item.coachingCenter) ?? '',
      isActive: item.isActive ?? true,
    });
    setEditError('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditSaving(true);
    try {
      const payload = { name: editForm.name, role: editForm.role, isActive: editForm.isActive };
      payload.coachingCenter = editForm.role === 'coaching_admin' ? editForm.coachingCenter : null;
      await adminsAPI.update(editTarget._id, payload);
      toast('Account updated');
      setEditTarget(null);
      reloadAll();
    } catch (err) {
      const status = err?.response?.status;
      if (status === 403) setEditError(err?.response?.data?.message ?? "You don't have permission to perform this action.");
      else if (status === 400) setEditError(err?.response?.data?.message ?? 'Invalid role/coaching center combination.');
      else setEditError(err?.response?.data?.message ?? 'Failed to save changes.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await adminsAPI.remove(deleteTarget._id);
      toast('Account deleted');
      setDeleteTarget(null);
      reloadAll();
    } catch (err) {
      toast(err?.response?.data?.message ?? 'Delete failed', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const ROLE_BADGE = {
    admin: 'bg-blue-100 text-blue-700',
    superadmin: 'bg-purple-100 text-purple-700',
    coaching_admin: 'bg-teal-100 text-teal-700',
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Admins</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage Admin and Coaching Admin accounts</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition-colors">
          <span>+</span> New Account
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('admins')} className={`px-4 py-2 text-sm font-semibold rounded-lg ${tab === 'admins' ? 'bg-primary-600 text-white' : 'bg-white border border-gray-300 text-gray-600'}`}>
          Admins ({admins.length})
        </button>
        <button onClick={() => setTab('coaching_admins')} className={`px-4 py-2 text-sm font-semibold rounded-lg ${tab === 'coaching_admins' ? 'bg-primary-600 text-white' : 'bg-white border border-gray-300 text-gray-600'}`}>
          Coaching Admins ({coachingAdmins.length})
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {tab === 'admins' ? (
          adminsLoading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
          ) : admins.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No admin accounts found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-24">Role</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-20">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-32 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {admins.map((a) => (
                  <tr key={a._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{a.name}</td>
                    <td className="px-4 py-3 text-gray-500">{a.email}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[a.role]}`}>{a.role}</span></td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {a.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(a)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700">✏️</button>
                        <button onClick={() => setDeleteTarget(a)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : caLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : coachingAdmins.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No coaching admin accounts found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Coaching Center</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-20">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-32 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {coachingAdmins.map((a) => (
                <tr key={a._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{a.name}</td>
                  <td className="px-4 py-3 text-gray-500">{a.email}</td>
                  <td className="px-4 py-3 text-gray-500">{a._centerName}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {a.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(a)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700">✏️</button>
                      <button onClick={() => setDeleteTarget(a)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Admin / Coaching Admin Account" size="md">
        <CreateForm form={createForm} setForm={setCreateForm} centers={centers} onSubmit={handleCreate} loading={createSaving} error={createError} />
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit ${editTarget?.name ?? ''}`} size="md">
        <EditForm form={editForm} setForm={setEditForm} centers={centers} onSubmit={handleEditSubmit} loading={editSaving} error={editError} />
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Account"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        danger
        loading={deleting}
      />
    </div>
  );
}
