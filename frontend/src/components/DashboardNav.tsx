import Link from 'next/link';

interface DashboardNavProps {
  onLogout: () => void;
  currentPath?: string;
}

export default function DashboardNav({ onLogout, currentPath = '/dashboard' }: DashboardNavProps) {
  const isActive = (path: string) => currentPath === path;

  return (
    <header className="bg-gray-800/50 backdrop-blur-xl border-b border-gray-700/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/dashboard" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">Anvora</span>
          </Link>
          <nav className="flex items-center space-x-6">
            <Link
              href="/dashboard"
              className={isActive('/dashboard') ? 'text-emerald-400 font-medium' : 'text-gray-400 hover:text-white transition-colors'}
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/contacts"
              className={isActive('/dashboard/contacts') ? 'text-emerald-400 font-medium' : 'text-gray-400 hover:text-white transition-colors'}
            >
              Contacts
            </Link>
            <Link
              href="/dashboard/instances"
              className={isActive('/dashboard/instances') ? 'text-emerald-400 font-medium' : 'text-gray-400 hover:text-white transition-colors'}
            >
              Instances
            </Link>
            <Link
              href="/dashboard/templates"
              className={isActive('/dashboard/templates') ? 'text-emerald-400 font-medium' : 'text-gray-400 hover:text-white transition-colors'}
            >
              Templates
            </Link>
            <Link
              href="/dashboard/messages"
              className={isActive('/dashboard/messages') ? 'text-emerald-400 font-medium' : 'text-gray-400 hover:text-white transition-colors'}
            >
              Messages
            </Link>
            <button
              onClick={onLogout}
              className="text-gray-400 hover:text-white transition-colors"
            >
              Logout
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
