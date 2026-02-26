import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import TermSelector from '../shared/TermSelector';
import { Role } from '../../utils/roles';

const AppShell: React.FC = () => {
	const { state, logout } = useAuth();
	const role = state?.role as Role | undefined;

	const links: { to: string; label: string }[] = [];
	if (role === 'admin') {
		links.push({ to: '/dashboard', label: 'Dashboard' }, { to: '/users', label: 'Users' }, { to: '/terms', label: 'Terms' }, { to: '/courses', label: 'Courses' }, { to: '/config', label: 'Grading Settings' });
	} else if (role === 'teacher') {
		links.push({ to: '/dashboard', label: 'Dashboard' });
		links.push({ to: '/courses', label: 'My Courses' });
	} else if (role === 'student') {
		links.push({ to: '/grades', label: 'My Grades' });
	}

	return (
		<div className="flex h-screen">
			<aside className="w-[200px] bg-[#2c3e50] text-white flex flex-col flex-shrink-0">
				<div className="px-4 py-6 text-2xl font-bold">Grade Tracker</div>
				<nav className="flex flex-col">
					{links.map((l) => (
						<NavLink key={l.to} to={l.to} className={({ isActive }) => `px-4 py-2 hover:bg-[#3d5166] ${isActive ? 'bg-[#3d5166] text-white' : 'text-white'}`}>
							{l.label}
						</NavLink>
					))}
				</nav>
				<div className="mt-auto px-4 py-4">
					<div className="mb-2 text-sm">{state?.user_id || 'Unknown user'}</div>
					<button className="text-sm underline" onClick={() => logout()}>
						Logout
					</button>
				</div>
			</aside>
			<div className="flex-1 flex flex-col overflow-hidden">
				<header className="flex items-center justify-between px-6 py-3 border-b bg-white">
					<div className="text-xl font-semibold">{/* page title slot could be inserted via context or props if needed */}</div>
					<TermSelector />
				</header>
				<main className="flex-1 overflow-y-auto p-6">
					<Outlet />
				</main>
			</div>
		</div>
	);
};

export default AppShell;
