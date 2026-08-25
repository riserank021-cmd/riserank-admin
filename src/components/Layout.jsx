import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// ── Role-based sidebar (Phase 9) ──────────────────────────────────────────────
// Frontend nav visibility is UX only — the real security boundary is the
// backend's authorize()/requireCoachingOwnership middleware on each route.
// These lists are additionally shaped by what the backend ACTUALLY allows
// per role today (not just what would be ideal), specifically:
//   - "Admins" (create/update Admin & Coaching Admin accounts) is
//     SUPER_ADMIN only — PATCH/POST /admin/admins has no ADMIN grant.
//   - "Activity Logs" is SUPER_ADMIN only — GET /analytics/admin-logs is
//     gated by authorize(ROLES.SUPER_ADMIN) only, not ALL_ADMINS.
//   - "Coaching Centers" and "Exams" (global) are ADMIN + SUPER_ADMIN.
//   - Users/Reports/Analytics/System Health/etc. are unchanged from before
//     this feature — still ADMIN + SUPER_ADMIN, same as always.
const SUPER_ADMIN_ONLY_NAV = [
  { to: '/admins',          icon: '🛡️', label: 'Admins'            },
];

const ADMIN_SHARED_NAV = [
  { to: '/users',            icon: '👥', label: 'Users'            },
  { to: '/coaching-centers', icon: '🏫', label: 'Coaching Centers' },
  { to: '/exams',            icon: '🎯', label: 'Exams'             },
  { to: '/current-affairs',  icon: '📰', label: 'Current Affairs'   },
  { to: '/quizzes',          icon: '📝', label: 'Quizzes'           },
  { to: '/questions',        icon: '❓', label: 'Questions'         },
  { to: '/videos',           icon: '🎬', label: 'Videos'            },
  { to: '/video-dashboard',  icon: '🎥', label: 'Video Dashboard'   },
  { to: '/live-scheduler',   icon: '📡', label: 'Live Scheduler'    },
  { to: '/playlists',        icon: '📁', label: 'Courses'           },
  { to: '/course-requests',  icon: '🔑', label: 'Course Requests'   },
  { to: '/teachers',         icon: '🧑‍🏫', label: 'Teachers'          },
  { to: '/batches',          icon: '👥', label: 'Batches'           },
  { to: '/categories',       icon: '📂', label: 'Categories'        },
  { to: '/live-tests',       icon: '🔴', label: 'Live Tests'        },
  { to: '/reports',          icon: '🚩', label: 'Reports'           },
  { to: '/analytics',        icon: '📈', label: 'Analytics'         },
  { to: '/video-analytics',  icon: '📈', label: 'Video Analytics'   },
  { to: '/notifications',    icon: '🔔', label: 'Notifications'     },
  { to: '/import',           icon: '⬆️', label: 'Bulk Import'       },
  { to: '/system-health',    icon: '🩺', label: 'System Health'     },
  { to: '/exam-dates',       icon: '📅', label: 'Exam Dates'        },
  { to: '/faqs',             icon: '❓', label: 'FAQs'               },
  { to: '/support-tickets',  icon: '🎫', label: 'Support Tickets'   },
];

const SUPER_ADMIN_TAIL_NAV = [
  { to: '/activity-logs',   icon: '🕵️', label: 'Activity Logs'     },
];

const COACHING_ADMIN_NAV = [
  { to: '/',           icon: '📊', label: 'Dashboard'  },
  { to: '/exams',      icon: '🎯', label: 'Exams'       },
  { to: '/videos',     icon: '🎬', label: 'Videos'      },
  { to: '/playlists',  icon: '📁', label: 'Courses'     },
  { to: '/teachers',   icon: '🧑‍🏫', label: 'Teachers'   },
  { to: '/quizzes',    icon: '📝', label: 'Quizzes'     },
  { to: '/profile',    icon: '👤', label: 'My Profile'  },
];

function buildNav(role) {
  const dashboard = { to: '/', icon: '📊', label: 'Dashboard' };
  const profile = { to: '/profile', icon: '👤', label: 'My Profile' };

  if (role === 'coaching_admin') return COACHING_ADMIN_NAV;
  if (role === 'superadmin') {
    return [dashboard, ...SUPER_ADMIN_ONLY_NAV, ...ADMIN_SHARED_NAV, ...SUPER_ADMIN_TAIL_NAV, profile];
  }
  // 'admin' (and any unexpected role, fails safe to the smallest set)
  return [dashboard, ...ADMIN_SHARED_NAV, profile];
}

export function Layout({ children }) {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const NAV = buildNav(admin?.role);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">R</div>
            <div>
              <div className="font-bold text-gray-900 text-sm">RiseRank</div>
              <div className="text-xs text-gray-400">Admin Panel</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <span className="text-base">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-sm font-bold text-primary-700">
              {admin?.name?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-gray-900 truncate">{admin?.name ?? 'Admin'}</div>
              <div className="text-xs text-gray-400 capitalize">{(admin?.role ?? 'admin').replace('_', ' ')}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
