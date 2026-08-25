/**
 * SystemHealth.jsx
 * "Is email/push/database/storage actually working" — not just "is the API
 * up" (that's already covered by nothing failing when this page loads).
 * Built after two of the app's worst bugs turned out to be integrations
 * that looked configured but were silently broken in production (OTP
 * emails failing silently, 0 users ever getting a registered FCM token) —
 * neither was visible anywhere in this admin panel until a student
 * complained. This screen surfaces both passive config checks and two
 * active tests (a real test email to your own inbox, a real test push to
 * any user by ID) so that failure mode shows up here first.
 *
 * The same backend endpoints (/system-health/*) also power the mobile
 * app's own admin System Health screen — this is the web equivalent.
 */

import { useState, useEffect, useCallback } from 'react';
import { systemHealthAPI } from '../api/client';
import { useToast } from '../components/Toast';

const STATUS_META = {
  ok:    { icon: '✅', label: 'OK',    color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  warn:  { icon: '⚠️', label: 'Check', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  error: { icon: '❌', label: 'Down',  color: 'text-red-700',   bg: 'bg-red-50 border-red-200' },
};

export default function SystemHealth() {
  const toast = useToast();
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingPush, setTestingPush] = useState(false);
  const [pushUserId, setPushUserId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await systemHealthAPI.check();
      setChecks(data.data?.checks ?? []);
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Failed to load system health');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleTestEmail = async () => {
    setTestingEmail(true);
    try {
      const { data } = await systemHealthAPI.testEmail();
      toast(data.message ?? 'Test email sent — check your inbox (and spam folder).', 'success');
    } catch (err) {
      toast(err?.response?.data?.message ?? 'Could not send a test email', 'error');
    } finally {
      setTestingEmail(false);
    }
  };

  const handleTestPush = async () => {
    if (!pushUserId.trim()) {
      toast('Enter a User ID to test — your own admin login has no mobile device to push to', 'error');
      return;
    }
    setTestingPush(true);
    try {
      const { data } = await systemHealthAPI.testPush(pushUserId.trim());
      const result = data.data;
      toast(result?.detail ?? data.message ?? 'Done', result?.sent > 0 ? 'success' : 'error');
    } catch (err) {
      toast(err?.response?.data?.message ?? 'Could not send a test push', 'error');
    } finally {
      setTestingPush(false);
    }
  };

  const errorCount = checks.filter((c) => c.status === 'error').length;
  const warnCount = checks.filter((c) => c.status === 'warn').length;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🩺 System Health</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading
              ? 'Checking…'
              : errorCount > 0
                ? `${errorCount} issue(s) need attention`
                : warnCount > 0
                  ? `${warnCount} item(s) worth a look`
                  : 'Everything looks healthy'}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Checking…</div>
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">⚠️</p>
          <p className="text-gray-700 font-medium mb-4">{error}</p>
          <button onClick={load} className="text-sm font-semibold px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">
            Try Again
          </button>
        </div>
      ) : (
        <>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Configuration &amp; Connectivity
          </p>
          <div className="space-y-2 mb-8">
            {checks.map((c) => {
              const meta = STATUS_META[c.status] ?? STATUS_META.warn;
              return (
                <div key={c.key} className={`border rounded-xl px-4 py-3 flex items-start gap-3 ${meta.bg}`}>
                  <span className="text-lg leading-none mt-0.5">{meta.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900">{c.label}</p>
                      <span className={`text-[11px] font-bold ${meta.color}`}>{meta.label}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{c.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Active Tests</p>
          <p className="text-xs text-gray-500 mb-3">
            Configuration can look correct and still be broken (wrong password, expired key). These actually send a
            real email/push — the only way to confirm delivery works, not just that it's configured.
          </p>

          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">📧 Send test email</p>
                <p className="text-xs text-gray-400 mt-0.5">Delivers to your admin account's email address</p>
              </div>
              <button
                onClick={handleTestEmail}
                disabled={testingEmail}
                className="text-xs font-semibold px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 flex-shrink-0"
              >
                {testingEmail ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-900 mb-0.5">🔔 Send test push</p>
            <p className="text-xs text-gray-400 mb-3">
              Your web admin login has no mobile device — enter a real user's ID to test their device instead.
            </p>
            <div className="flex gap-2">
              <input
                value={pushUserId}
                onChange={(e) => setPushUserId(e.target.value)}
                placeholder="MongoDB ObjectId of the user"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
              <button
                onClick={handleTestPush}
                disabled={testingPush}
                className="text-xs font-semibold px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 flex-shrink-0"
              >
                {testingPush ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
