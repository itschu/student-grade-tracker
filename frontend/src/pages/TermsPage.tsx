import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import { useToast } from '../contexts/ToastContext';
import ConfirmDialog from '../components/shared/ConfirmDialog';

const TermsPage: React.FC = () => {
	const qc = useQueryClient();
	const { showSuccess, showError } = useToast();

	const [newOpen, setNewOpen] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editDraft, setEditDraft] = useState<any>({ name: '', start_date: '', end_date: '' });
	const [archiveTarget, setArchiveTarget] = useState<any | null>(null);

	const termsQ = useQuery({ queryKey: ['terms'], queryFn: () => client.get('/api/v1/terms').then((r) => r.data) });

	const createMut = useMutation({
		mutationFn: (body: any) => client.post('/api/v1/terms', body).then((r) => r.data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['terms'] });
			showSuccess('Term created');
			setNewOpen(false);
		},
		onError: (e: any) => showError(e?.response?.data?.error || 'Failed to create term'),
	});

	const updateMut = useMutation({
		mutationFn: ({ id, body }: { id: string; body: any }) => client.patch(`/api/v1/terms/${id}`, body).then((r) => r.data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['terms'] });
			showSuccess('Term updated');
			setEditingId(null);
			setArchiveTarget(null);
		},
		onError: (e: any) => showError(e?.response?.data?.error || 'Failed to update term'),
	});

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-bold">Terms</h1>
				<button className="px-4 py-2 bg-[#2c3e50] text-white rounded" onClick={() => setNewOpen(true)}>
					+ New Term
				</button>
			</div>

			<div className="bg-white rounded-lg border border-gray-200 shadow-sm">
				{termsQ.isLoading ? (
					<div className="p-8 flex justify-center">
						<div className="animate-spin h-8 w-8 border-4 border-[#2c3e50] border-t-transparent rounded-full" />
					</div>
				) : termsQ.isError ? (
					<div className="p-6 text-red-600">
						Failed to load.{' '}
						<button onClick={() => termsQ.refetch()} className="underline">
							Retry
						</button>
					</div>
				) : (
					<table className="w-full">
						<thead>
							<tr className="bg-gray-50">
								<th className="px-4 py-3 text-left">Name</th>
								<th className="px-4 py-3 text-left">Start Date</th>
								<th className="px-4 py-3 text-left">End Date</th>
								<th className="px-4 py-3 text-left">Status</th>
								<th className="px-4 py-3 text-left">Actions</th>
							</tr>
						</thead>
						<tbody>
							{(termsQ.data || []).map((t: any) => (
								<tr key={t.id} className="border-t">
									<td className="px-4 py-3">{editingId === t.id ? <input value={editDraft.name} onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} className="w-full border px-2 py-1 rounded" /> : t.name}</td>
									<td className="px-4 py-3">{editingId === t.id ? <input type="date" value={editDraft.start_date} onChange={(e) => setEditDraft({ ...editDraft, start_date: e.target.value })} className="w-full border px-2 py-1 rounded" /> : t.start_date}</td>
									<td className="px-4 py-3">{editingId === t.id ? <input type="date" value={editDraft.end_date} onChange={(e) => setEditDraft({ ...editDraft, end_date: e.target.value })} className="w-full border px-2 py-1 rounded" /> : t.end_date}</td>
									<td className="px-4 py-3">{t.is_archived ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Archived</span> : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>}</td>
									<td className="px-4 py-3">
										{editingId === t.id ? (
											<>
												<button className="mr-2 px-3 py-1 bg-[#2c3e50] text-white rounded" onClick={() => updateMut.mutate({ id: t.id, body: editDraft })}>
													Save
												</button>
												<button
													className="px-3 py-1 border rounded"
													onClick={() => {
														setEditingId(null);
														setEditDraft({ name: '', start_date: '', end_date: '' });
													}}
												>
													Cancel
												</button>
											</>
										) : (
											<>
												<button
													className="mr-2 text-sm underline"
													onClick={() => {
														setEditingId(t.id);
														setEditDraft({ name: t.name, start_date: t.start_date, end_date: t.end_date });
													}}
												>
													Edit
												</button>
												{!t.is_archived && (
													<button className="text-sm text-red-600" onClick={() => setArchiveTarget(t)}>
														Archive
													</button>
												)}
											</>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>

			{newOpen && (
				<div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center">
					<div className="bg-white rounded-lg p-6 w-[480px] shadow-xl">
						<h2 className="text-lg font-semibold mb-4">New Term</h2>
						<NewTermForm onCancel={() => setNewOpen(false)} onSubmit={(body: any) => createMut.mutate(body)} />
					</div>
				</div>
			)}

			<ConfirmDialog
				isOpen={!!archiveTarget}
				title="Archive Term"
				message={`Archive term "${archiveTarget?.name}"? Archived terms cannot receive new courses.`}
				onConfirm={() => archiveTarget && updateMut.mutate({ id: archiveTarget.id, body: { is_archived: true } })}
				onCancel={() => setArchiveTarget(null)}
			/>
		</div>
	);
};

function NewTermForm({ onCancel, onSubmit }: any) {
	const [name, setName] = useState('');
	const [start_date, setStart] = useState('');
	const [end_date, setEnd] = useState('');
	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				onSubmit({ name, start_date, end_date });
			}}
		>
			<label className="block text-sm font-medium text-gray-700 mb-1">Term Name</label>
			<input className="w-full border px-3 py-2 mb-3" value={name} onChange={(e) => setName(e.target.value)} />
			<label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
			<input type="date" className="w-full border px-3 py-2 mb-3" value={start_date} onChange={(e) => setStart(e.target.value)} />
			<label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
			<input type="date" className="w-full border px-3 py-2 mb-4" value={end_date} onChange={(e) => setEnd(e.target.value)} />
			<div className="flex justify-end gap-2">
				<button type="button" onClick={onCancel} className="px-4 py-2 border rounded">
					Cancel
				</button>
				<button type="submit" className="px-4 py-2 bg-[#2c3e50] text-white rounded">
					Create
				</button>
			</div>
		</form>
	);
}

export default TermsPage;
