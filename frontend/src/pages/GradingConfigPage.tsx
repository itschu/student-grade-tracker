import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import { useTerm } from '../contexts/TermContext';
import { useToast } from '../contexts/ToastContext';
import ConfirmDialog from '../components/shared/ConfirmDialog';

const GradingConfigPage: React.FC = () => {
	const qc = useQueryClient();
	const { activeTerm } = useTerm();
	const { showSuccess, showError } = useToast();

	const [open, setOpen] = useState(false);

	const termsQ = useQuery({ queryKey: ['terms'], queryFn: () => client.get('/api/v1/terms').then((r) => r.data) });
	const configsQ = useQuery({ queryKey: ['config'], queryFn: () => client.get('/api/v1/config').then((r) => r.data) });
	const effectiveQ = useQuery({ queryKey: ['config', 'effective', activeTerm?.id], queryFn: () => client.get(`/api/v1/config/effective?term_id=${activeTerm?.id}`).then((r) => r.data), enabled: !!activeTerm });

	const createMut = useMutation({
		mutationFn: (b: any) => client.post('/api/v1/config', b).then((r) => r.data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['config'] });
			qc.invalidateQueries({ queryKey: ['config', 'effective'] });
			showSuccess('Config created');
			setOpen(false);
		},
		onError: (e: any) => showError(e?.response?.data?.error || 'Failed'),
	});

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-bold">Grading Configurations</h1>
				<button className="px-4 py-2 bg-[#2c3e50] text-white rounded" onClick={() => setOpen(true)}>
					+ New Config
				</button>
			</div>

			<div className="mb-6">
				<h2 className="text-lg font-semibold">Effective for Active Term</h2>
				<div className="p-4 bg-white rounded border">{effectiveQ.isLoading ? <div className="text-sm text-gray-500">Loading...</div> : effectiveQ.isError ? <div className="text-red-600">Failed to load effective config</div> : <EffectiveView config={effectiveQ.data} />}</div>
			</div>

			<div>
				<h2 className="text-lg font-semibold mb-3">All Configs</h2>
				<div className="bg-white rounded-lg border p-4">
					{configsQ.isLoading ? (
						<div className="text-sm text-gray-500">Loading...</div>
					) : configsQ.isError ? (
						<div className="text-red-600">Failed to load configs</div>
					) : (
						<div className="space-y-4">
							{(configsQ.data || []).map((c: any) => (
								<div key={c.id} className="border rounded p-3">
									<div className="flex justify-between items-center mb-2">
										<div className="font-medium">Display: {c.display_mode}</div>
										<div className="text-sm text-gray-600">Effective from term id: {c.effective_from_term_id || '—'}</div>
									</div>
									<div className="text-sm">
										{(c.boundaries || []).map((b: any) => (
											<div key={b.name} className="flex items-center gap-4 text-sm">
												<div className="w-36 font-medium">{b.name}</div>
												<div>Min %: {b.min_percent}</div>
												{b.gpa_value !== undefined && <div>GPA: {b.gpa_value}</div>}
											</div>
										))}
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>

			{open && <CreateConfigModal terms={termsQ.data || []} onClose={() => setOpen(false)} onCreate={(b: any) => createMut.mutate(b)} />}
		</div>
	);
};

function EffectiveView({ config }: any) {
	if (!config) return <div className="text-sm text-gray-500">No effective config</div>;
	return (
		<div>
			<div className="mb-2">
				Display Mode: <strong>{config.display_mode}</strong>
			</div>
			<div className="space-y-1">
				{(config.boundaries || []).map((b: any) => (
					<div key={b.name} className="flex gap-4 items-center">
						<div className="font-medium w-36">{b.name}</div>
						<div>Min %: {b.min_percent}</div>
						{b.gpa_value !== undefined && <div>GPA: {b.gpa_value}</div>}
					</div>
				))}
			</div>
		</div>
	);
}

function CreateConfigModal({ terms, onClose, onCreate }: any) {
	const [display_mode, setDisplayMode] = useState('percentage');
	const [effective_from_term_id, setTerm] = useState(terms?.[0]?.id || '');
	const [apply_all, setApplyAll] = useState(false);
	const [boundaries, setBoundaries] = useState([
		{ name: 'A', min_percent: 90, gpa_value: 4.0 },
		{ name: 'B', min_percent: 80, gpa_value: 3.0 },
	]);

	const updateBoundary = (idx: number, patch: any) => setBoundaries((prev) => prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
	const addBoundary = () => setBoundaries((prev) => [...prev, { name: '', min_percent: 0 }]);
	const removeBoundary = (idx: number) => setBoundaries((prev) => prev.filter((_, i) => i !== idx));

	return (
		<div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center">
			<div className="bg-white rounded-lg p-6 w-[720px] shadow-xl max-h-[80vh] overflow-y-auto">
				<h2 className="text-lg font-semibold mb-4">New Grading Config</h2>
				<div className="grid grid-cols-2 gap-4 mb-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Display Mode</label>
						<select className="w-full border px-3 py-2" value={display_mode} onChange={(e) => setDisplayMode(e.target.value)}>
							<option value="percentage">Percentage</option>
							<option value="letter">Letter</option>
							<option value="gpa">GPA</option>
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Effective From Term</label>
						<select className="w-full border px-3 py-2" value={effective_from_term_id} onChange={(e) => setTerm(e.target.value)}>
							<option value="">-- select --</option>
							{(terms || []).map((t: any) => (
								<option key={t.id} value={t.id}>
									{t.name}
								</option>
							))}
						</select>
					</div>
				</div>

				<div className="mb-4">
					<label className="flex items-center gap-2">
						<input type="checkbox" checked={apply_all} onChange={(e) => setApplyAll(e.target.checked)} /> Apply to all historical terms
					</label>
				</div>

				<div className="mb-4">
					<div className="flex items-center justify-between mb-2">
						<div className="font-medium">Boundaries</div>
						<button className="text-sm underline" onClick={addBoundary}>
							Add
						</button>
					</div>
					<div className="space-y-2">
						{boundaries.map((b: any, idx: number) => (
							<div key={idx} className="flex gap-2 items-center">
								<input className="border px-2 py-1 w-28" value={b.name} onChange={(e) => updateBoundary(idx, { name: e.target.value })} placeholder="Name" />
								<input className="border px-2 py-1 w-28" type="number" value={b.min_percent} onChange={(e) => updateBoundary(idx, { min_percent: Number(e.target.value) })} placeholder="Min %" />
								<input className="border px-2 py-1 w-28" type="number" step="0.1" value={b.gpa_value ?? ''} onChange={(e) => updateBoundary(idx, { gpa_value: e.target.value === '' ? null : Number(e.target.value) })} placeholder="GPA (optional)" />
								<button className="text-red-600" onClick={() => removeBoundary(idx)}>
									Remove
								</button>
							</div>
						))}
					</div>
				</div>

				<div className="flex justify-end gap-2">
					<button className="px-4 py-2 border rounded" onClick={onClose}>
						Cancel
					</button>
					<button
						className="px-4 py-2 bg-[#2c3e50] text-white rounded"
						onClick={() => {
							const payload = {
								display_mode,
								effective_from_term_id: effective_from_term_id || null,
								apply_to_all_historical: apply_all,
								boundaries: boundaries.map((bb: any) => ({ name: bb.name, min_percent: Number(bb.min_percent), gpa_value: bb.gpa_value === null ? null : bb.gpa_value })),
							};
							onCreate(payload);
						}}
					>
						Create
					</button>
				</div>
			</div>
		</div>
	);
}

export default GradingConfigPage;
