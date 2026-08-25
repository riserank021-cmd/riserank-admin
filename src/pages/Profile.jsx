import { useState, useEffect } from 'react';
import { adminsAPI, coachingCentersAPI } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/Toast';

// Self-service profile page — GET /admin/me + PUT /admin/me/change-password
// (Bug #2). Available to admin/superadmin/coaching_admin alike. Deliberately
// has NO role/coachingCenter/isActive fields anywhere on this page — those
// are admin-family account-management concerns handled only by
// Admins.jsx (Super Admin only), never self-editable here, per spec §6/§25.
const input = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';
const label = 'block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5';

const ROLE_LABELS = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  coaching_admin: 'Coaching Admin',
};

export default function Profile() {
  const { updateAdmin } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState(null);
  const [center, setCenter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [pwError, setPwError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await adminsAPI.getMe();
      const admin = data.data.admin;
      setProfile(admin);
      updateAdmin(admin); // keep sidebar/role state fresh
      if (admin.coachingCenter) {
        const centerId = typeof admin.coachingCenter === 'object' ? admin.coachingCenter._id : admin.coachingCenter;
        try {
          const { data: centerData } = await coachingCentersAPI.getById(centerId);
          setCenter(centerData.data?.coachingCenter ?? null);
        } catch {
          // Non-fatal — profile still renders without the center card.
        }
      }
    } catch (err) {
      if (err?.response?.status === 403) {
        setError("You don't have permission to perform this action.");
      } else {
        setError('Could not load your profile.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('New password and confirmation do not match.');
      return;
    }
    setSaving(true);
    try {
      await adminsAPI.changeMyPassword({
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      toast('Password changed successfully');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message;
      if (status === 400) setPwError(msg ?? 'Current password is incorrect.');
      else if (status === 403) setPwError("You don't have permission to perform this action.");
      else setPwError(msg ?? 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-400 text-sm">Loading…</div>;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900 mb-6">My Profile</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center text-xl font-bold text-primary-700">
            {profile?.name?.[0]?.toUpperCase() ?? 'A'}
          </div>
          <div>
            <div className="font-bold text-gray-900">{profile?.name}</div>
            <div className="text-sm text-gray-500">{profile?.email}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className={label}>Role</div>
            <div className="text-gray-800">{ROLE_LABELS[profile?.role] ?? profile?.role}</div>
          </div>
          <div>
            <div className={label}>Status</div>
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${profile?.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {profile?.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          {center && (
            <div className="col-span-2">
              <div className={label}>Coaching Center</div>
              <div className="text-gray-800">{center.name}</div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Change Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className={label}>Current Password</label>
            <input type="password" required className={input} value={pwForm.currentPassword}
              onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))} />
          </div>
          <div>
            <label className={label}>New Password</label>
            <input type="password" required minLength={8} className={input} value={pwForm.newPassword}
              onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
              placeholder="At least 8 characters, upper/lowercase + a number" />
          </div>
          <div>
            <label className={label}>Confirm New Password</label>
            <input type="password" required className={input} value={pwForm.confirmPassword}
              onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))} />
          </div>
          {pwError && (
            <div className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">{pwError}</div>
          )}
          <div className="flex justify-end">
            <button type="submit" disabled={saving}
              className="px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
              {saving ? 'Saving…' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
