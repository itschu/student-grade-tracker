import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import { useToast } from '../contexts/ToastContext';
import ConfirmDialog from '../components/shared/ConfirmDialog';

type role = 'teacher' | 'student' | 'admin';

interface User {
	id: string;
	full_name: string;
	email: string;
	role: role;
	is_active: boolean;
}

// payload sent when creating/updating a user
interface UserPayload {
	full_name: string;
	email: string;
	role?: role; // optional during edit
	password?: string;
}

interface AddEditFormProps {
	initial?: User;
	editMode?: boolean;
	onSubmit: (body: UserPayload) => void;
	onCancel: () => void;
}

const UsersPage: React.FC = () => {
	const queryClient = useQueryClient();
	const { showSuccess, showError } = useToast();

	const [activeTab, setActiveTab] = useState<'teacher' | 'student'>('teacher');
	const [search, setSearch] = useState('');
	const [addOpen, setAddOpen] = useState(false);
	const [editTarget, setEditTarget] = useState<User | null>(null);
	const [deactivateTarget, setDeactivateTarget] = useState<User | null>(null);

	const teachersQ = useQuery<User[]>({
		queryKey: ['users', 'teacher'],
		queryFn: () => client.get('/api/v1/users?role=teacher').then((r) => r.data),
	});
	const studentsQ = useQuery<User[]>({
		queryKey: ['users', 'student'],
		queryFn: () => client.get('/api/v1/users?role=student').then((r) => r.data),
	});

	const createMut = useMutation({
		mutationFn: (payload: UserPayload) => client.post('/api/v1/users', payload).then((r) => r.data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['users'] });
			showSuccess('User created');
			setAddOpen(false);
		},
		onError: (e: unknown) => showError((e as any)?.response?.data?.error || 'Failed to create user'),
	});

	const updateMut = useMutation({
		mutationFn: ({ id, body }: { id: string; body: UserPayload }) => client.patch(`/api/v1/users/${id}`, body).then((r) => r.data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['users'] });
			showSuccess('User updated');
			setEditTarget(null);
		},
		onError: (e: unknown) => showError((e as any)?.response?.data?.error || 'Failed to update user'),
	});

	const deactivateMut = useMutation({
		mutationFn: (id: string) => client.patch(`/api/v1/users/${id}`, { is_active: false }).then((r) => r.data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['users'] });
			showSuccess('User deactivated');
			setDeactivateTarget(null);
		},
		onError: (e: unknown) => showError((e as any)?.response?.data?.error || 'Failed to deactivate'),
	});

	const list = useMemo(() => {
		const data = (activeTab === 'teacher' ? teachersQ.data : studentsQ.data) || [];
		if (!search) return data;
		const q = search.toLowerCase();
		return data.filter((u: User) => (u.full_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
	}, [activeTab, teachersQ.data, studentsQ.data, search]);

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-bold">Users</h1>
				<button onClick={() => setAddOpen(true)} className="px-4 py-2 bg-[#2c3e50] text-white rounded">
					+ Add User
				</button>
			</div>

			<div className="mb-4 flex gap-2">
				<button onClick={() => setActiveTab('teacher')} className={`px-3 py-1 ${activeTab === 'teacher' ? 'border-b-2 border-[#2c3e50]' : ''}`}>
					Teachers
				</button>
				<button onClick={() => setActiveTab('student')} className={`px-3 py-1 ${activeTab === 'student' ? 'border-b-2 border-[#2c3e50]' : ''}`}>
					Students
				</button>
				<input className="ml-auto border px-3 py-1 rounded" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
			</div>

			<div className="bg-white rounded-lg border border-gray-200 shadow-sm">
				{(activeTab === 'teacher' ? teachersQ.isLoading : studentsQ.isLoading) ? (
					<div className="p-8 flex justify-center">
						<div className="animate-spin h-8 w-8 border-4 border-[#2c3e50] border-t-transparent rounded-full" />
					</div>
				) : (activeTab === 'teacher' ? teachersQ.isError : studentsQ.isError) ? (
					<div className="p-6 text-red-600">
						Failed to load.{' '}
						<button
							onClick={() => {
								activeTab === 'teacher' ? teachersQ.refetch() : studentsQ.refetch();
							}}
							className="underline"
						>
							Retry
						</button>
					</div>
				) : (
					<table className="w-full">
						<thead>
							<tr className="bg-gray-50">
								<th className="px-4 py-3 text-left">Name</th>
								<th className="px-4 py-3 text-left">Email</th>
								<th className="px-4 py-3 text-left">Status</th>
								<th className="px-4 py-3 text-left">Actions</th>
							</tr>
						</thead>
						<tbody>
							{list.map((u: User) => (
								<tr key={u.id} className="border-t">
									<td className="px-4 py-3">{u.full_name}</td>
									<td className="px-4 py-3">{u.email}</td>
									<td className="px-4 py-3">{u.is_active ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span> : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Inactive</span>}</td>
									<td className="px-4 py-3">
										<button className="mr-2 text-sm underline" onClick={() => setEditTarget(u)}>
											Edit
										</button>
										<button className="text-sm text-red-600" onClick={() => setDeactivateTarget(u)} disabled={!u.is_active}>
											Deactivate
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>

			{/* Add modal */}
			{addOpen && (
				<div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center">
					<div className="bg-white rounded-lg p-6 w-[480px] shadow-xl">
						<h2 className="text-lg font-semibold mb-4">Add User</h2>
						<AddEditForm onSubmit={(body: UserPayload) => createMut.mutate(body)} onCancel={() => setAddOpen(false)} />
					</div>
				</div>
			)}

			{/* Edit modal */}
			{editTarget && (
				<div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center">
					<div className="bg-white rounded-lg p-6 w-[480px] shadow-xl">
						<h2 className="text-lg font-semibold mb-4">Edit User</h2>
						<AddEditForm initial={editTarget} onSubmit={(body: UserPayload) => updateMut.mutate({ id: editTarget.id, body })} onCancel={() => setEditTarget(null)} editMode />
					</div>
				</div>
			)}

			<ConfirmDialog isOpen={!!deactivateTarget} title="Deactivate User" message={`Are you sure you want to deactivate ${deactivateTarget?.full_name}?`} onConfirm={() => deactivateTarget && deactivateMut.mutate(deactivateTarget.id)} onCancel={() => setDeactivateTarget(null)} />
		</div>
	);
};

function AddEditForm({ initial, onSubmit, onCancel, editMode }: AddEditFormProps) {
	const [full_name, setFullName] = useState(initial?.full_name || '');
	const [email, setEmail] = useState(initial?.email || '');
	const [role, setRole] = useState(initial?.role || 'teacher');
	const [password, setPassword] = useState('');

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				const body: UserPayload = { full_name, email };
				if (!editMode) body.role = role;
				if (password) body.password = password;
				onSubmit(body);
			}}
		>
			<label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
			<input className="w-full border rounded px-3 py-2 mb-3" value={full_name} onChange={(e) => setFullName(e.target.value)} />
			<label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
			<input className="w-full border rounded px-3 py-2 mb-3" value={email} onChange={(e) => setEmail(e.target.value)} />
			{!editMode && (
				<>
					<label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
					<select className="w-full border rounded px-3 py-2 mb-3" value={role} onChange={(e) => setRole(e.target.value as role)}>
						<option value="teacher">Teacher</option>
						<option value="student">Student</option>
						<option value="admin">Admin</option>
					</select>
				</>
			)}
			<label className="block text-sm font-medium text-gray-700 mb-1">{editMode ? 'New Password (optional)' : 'Password'}</label>
			<input className="w-full border rounded px-3 py-2 mb-4" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
			<div className="flex justify-end gap-2">
				<button type="button" onClick={onCancel} className="px-4 py-2 border rounded">
					Cancel
				</button>
				<button type="submit" className="px-4 py-2 bg-[#2c3e50] text-white rounded">
					Save
				</button>
			</div>
		</form>
	);
}

export default UsersPage;
