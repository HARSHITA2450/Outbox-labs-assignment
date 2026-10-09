import type { User } from '../types';
import { Button } from './ui';

export function Header({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <span className="text-lg font-semibold text-brand">ReachInbox</span>
        <div className="flex items-center gap-3">
          <img src={user.avatar} alt="" referrerPolicy="no-referrer" className="h-9 w-9 rounded-full bg-gray-200" />
          <div className="hidden text-right leading-tight sm:block">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
          <Button variant="ghost" onClick={onLogout}>Log out</Button>
        </div>
      </div>
    </header>
  );
}
