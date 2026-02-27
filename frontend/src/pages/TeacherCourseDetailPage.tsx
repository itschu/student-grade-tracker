import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import { useToast } from '../contexts/ToastContext';
import { useTerm } from '../contexts/TermContext';
import DashboardWidgets from '../components/shared/DashboardWidgets';
import ConfirmDialog from '../components/shared/ConfirmDialog';

const TeacherCourseDetailPage: React.FC = () => {
	const { id } = useParams();
	const navigate = useNavigate();
	const location = useLocation();
	const { activeTerm } = useTerm();
	const courseFromState = (location.state as any)?.course;
	const courseTermId: string = courseFromState?.term_id || activeTerm?.id || '';
	const qc = useQueryClient();
	const { showSuccess, showError } = useToast();

	// Data fetching
	const assignmentsQ = useQuery({
		queryKey: ['assignments', id],
		queryFn: () => client.get(`/api/v1/assignments?course_id=${id}`).then((r) => r.data),
		enabled: !!id,
	});

	const termsQ = useQuery({
		queryKey: ['terms'],
		queryFn: () => client.get('/api/v1/terms').then((r) => r.data),
	});

	// Local state
	const [activeTab, setActiveTab] = useState<'assignments' | 'analytics'>('assignments');
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editForm, setEditForm] = useState<any>({ name: '', type: '', max_points: '', due_date: '' });
	const [maxScoreConfirm, setMaxScoreConfirm] = useState<{ assignmentId: string; body: any } | null>(null);
	const [addOpen, setAddOpen] = useState(false);
	const [newAssignment, setNewAssignment] = useState<any>({ name: '', type: 'homework', max_points: '', due_date: '' });
	const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
	const [gradesExistMap, setGradesExistMap] = useState<Record<string, boolean>>({});

	// Helper to check if grades exist for an assignment. Uses a per-assignment lookup.
	const gradesExist = (assignmentId: string) => {
		return !!gradesExistMap[assignmentId];
	};

	// Prefetch whether grades exist per assignment to avoid calling endpoint without required params
	useEffect(() => {
		const fetchExistence = async () => {
			if (!assignmentsQ.data || !id) return;
			const entries = assignmentsQ.data as any[];
			const map: Record<string, boolean> = { ...gradesExistMap };
			await Promise.all(
				entries.map(async (a) => {
					try {
						const res = await client.get(`/api/v1/grades?assignment_id=${a.id}&course_id=${id}`);
						const data = res.data;
						map[a.id] = !!data?.students?.some((s: any) => s.earned_points !== null);
					} catch (e) {
						// If the request fails, assume false for now
						map[a.id] = false;
					}
				}),
			);
			setGradesExistMap(map);
		};

		fetchExistence();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [assignmentsQ.data, id]);

	// Mutations
	const createMut = useMutation({
		mutationFn: (body: any) => client.post('/api/v1/assignments', body).then((r) => r.data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['assignments', id] });
			showSuccess('Assignment created');
			setAddOpen(false);
			setNewAssignment({ name: '', type: 'homework', max_points: '', due_date: '' });
		},
		onError: (e: any) => showError(e?.response?.data?.error || 'Failed to create assignment'),
	});

	const updateMut = useMutation({
		mutationFn: (variables: { aid: string; body: any }) => client.patch(`/api/v1/assignments/${variables.aid}`, variables.body).then((r) => r.data),
		onSuccess: (_, variables) => {
			qc.invalidateQueries({ queryKey: ['assignments', id] });
			showSuccess('Assignment updated');
			setEditingId(null);
			setEditForm({ name: '', type: '', max_points: '', due_date: '' });

			// If this was a max score confirmation, clear it
			if (maxScoreConfirm && maxScoreConfirm.assignmentId === variables.aid) {
				setMaxScoreConfirm(null);
			}
		},
		onError: (e: any) => showError(e?.response?.data?.error || 'Failed to update assignment'),
	});

	const deleteMut = useMutation({
		mutationFn: (aid: string) => client.delete(`/api/v1/assignments/${aid}`).then((r) => r.data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['assignments', id] });
			showSuccess('Assignment deleted');
			setDeleteTarget(null);
		},
		onError: (e: any) => {
			if (e?.response?.status === 409) showError('Cannot delete: grades have been entered');
			else showError(e?.response?.data?.error || 'Failed to delete assignment');
		},
	});

	// Handle edit form initialization
	const handleEditClick = (assignment: any) => {
		setEditingId(assignment.id);
		setEditForm({
			name: assignment.name,
			type: assignment.type,
			max_points: assignment.max_points,
			due_date: assignment.due_date || '',
		});
	};

	// Handle save with max score confirmation
	const handleSaveWithConfirmation = (aid: string, formData: any) => {
		if (gradesExist(aid)) {
			// Show confirmation dialog and store full payload so other fields are preserved
			setMaxScoreConfirm({ assignmentId: aid, body: formData });
		} else {
			// Save directly
			updateMut.mutate({ aid, body: formData });
		}
	};

	return (
		<div>
			{/* Breadcrumb navigation */}
			<div className="mb-4">
				<button className="text-sm underline" onClick={() => navigate('/courses')}>
					← My Courses
				</button>
			</div>

			<h1 className="text-2xl font-bold mb-2">Course Details</h1>

			{/* Tabs */}
			<div className="border-b border-gray-200 mb-6">
				<nav className="flex space-x-8">
					<button className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'assignments' ? 'border-[#2c3e50] text-[#2c3e50]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`} onClick={() => setActiveTab('assignments')}>
						Assignments
					</button>
					<button className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'analytics' ? 'border-[#2c3e50] text-[#2c3e50]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`} onClick={() => setActiveTab('analytics')}>
						Analytics
					</button>
				</nav>
			</div>

			{activeTab === 'assignments' && (
				<div>
					<div className="flex justify-end mb-4">
						<button className="px-3 py-1 bg-[#2c3e50] text-white rounded" onClick={() => setAddOpen(true)}>
							+ Add Assignment
						</button>
					</div>

					{/* Add Assignment Form */}
					{addOpen && (
						<div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
							<table className="w-full">
								<thead>
									<tr className="bg-gray-50">
										<th className="px-4 py-3 text-left">Name</th>
										<th className="px-4 py-3 text-left">Type</th>
										<th className="px-4 py-3 text-left">Max Score</th>
										<th className="px-4 py-3 text-left">Due Date</th>
										<th className="px-4 py-3 text-left">Actions</th>
									</tr>
								</thead>
								<tbody>
									<tr className="border-t">
										<td className="px-4 py-3">
											<input className="w-full border px-2 py-1" value={newAssignment.name} onChange={(e) => setNewAssignment({ ...newAssignment, name: e.target.value })} placeholder="Assignment name" />
										</td>
										<td className="px-4 py-3">
											<select className="w-full border px-2 py-1" value={newAssignment.type} onChange={(e) => setNewAssignment({ ...newAssignment, type: e.target.value })}>
												<option value="quiz">Quiz</option>
												<option value="exam">Exam</option>
												<option value="homework">Homework</option>
												<option value="project">Project</option>
											</select>
										</td>
										<td className="px-4 py-3">
											<input className="w-full border px-2 py-1" type="number" value={newAssignment.max_points} onChange={(e) => setNewAssignment({ ...newAssignment, max_points: e.target.value })} placeholder="Max points" />
										</td>
										<td className="px-4 py-3">
											<input className="w-full border px-2 py-1" type="date" value={newAssignment.due_date} onChange={(e) => setNewAssignment({ ...newAssignment, due_date: e.target.value })} />
										</td>
										<td className="px-4 py-3">
											<div className="flex gap-2">
												<button
													className="px-2 py-1 bg-green-600 text-white rounded text-sm"
													onClick={() => {
														if (id) {
															createMut.mutate({
																...newAssignment,
																course_id: id,
																max_points: Number(newAssignment.max_points),
															});
														}
													}}
												>
													Save
												</button>
												<button className="px-2 py-1 bg-gray-500 text-white rounded text-sm" onClick={() => setAddOpen(false)}>
													Cancel
												</button>
											</div>
										</td>
									</tr>
								</tbody>
							</table>
						</div>
					)}

					{/* Assignments Table */}
					<div className="bg-white rounded-lg border border-gray-200 shadow-sm">
						{assignmentsQ.isLoading ? (
							<div className="p-8 flex justify-center">
								<div className="animate-spin h-8 w-8 border-4 border-[#2c3e50] border-t-transparent rounded-full" />
							</div>
						) : assignmentsQ.isError ? (
							<div className="p-6 text-red-600">
								Failed to load assignments.{' '}
								<button onClick={() => assignmentsQ.refetch()} className="underline">
									Retry
								</button>
							</div>
						) : (
							<table className="w-full">
								<thead>
									<tr className="bg-gray-50">
										<th className="px-4 py-3 text-left">Name</th>
										<th className="px-4 py-3 text-left">Type</th>
										<th className="px-4 py-3 text-left">Max Score</th>
										<th className="px-4 py-3 text-left">Due Date</th>
										<th className="px-4 py-3 text-left">Actions</th>
									</tr>
								</thead>
								<tbody>
									{(assignmentsQ.data || []).map((a: any) =>
										editingId === a.id ? (
											// Edit row
											<tr key={a.id} className="border-t">
												<td className="px-4 py-3">
													<input className="w-full border px-2 py-1" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
												</td>
												<td className="px-4 py-3">
													<select className="w-full border px-2 py-1" value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}>
														<option value="quiz">Quiz</option>
														<option value="exam">Exam</option>
														<option value="homework">Homework</option>
														<option value="project">Project</option>
													</select>
												</td>
												<td className="px-4 py-3">
													<input className="w-full border px-2 py-1" type="number" value={editForm.max_points} onChange={(e) => setEditForm({ ...editForm, max_points: e.target.value })} />
												</td>
												<td className="px-4 py-3">
													<input className="w-full border px-2 py-1" type="date" value={editForm.due_date} onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })} />
												</td>
												<td className="px-4 py-3">
													<div className="flex gap-2">
														<button
															className="px-2 py-1 bg-green-600 text-white rounded text-sm"
															onClick={() =>
																handleSaveWithConfirmation(a.id, {
																	name: editForm.name,
																	type: editForm.type,
																	max_points: Number(editForm.max_points),
																	due_date: editForm.due_date,
																})
															}
														>
															Save
														</button>
														<button className="px-2 py-1 bg-gray-500 text-white rounded text-sm" onClick={() => setEditingId(null)}>
															Cancel
														</button>
													</div>
												</td>
											</tr>
										) : (
											// Display row
											<tr key={a.id} className="border-t">
												<td className="px-4 py-3">{a.name}</td>
												<td className="px-4 py-3">{a.type}</td>
												<td className="px-4 py-3">{a.max_points}</td>
												<td className="px-4 py-3">{a.due_date || '-'}</td>
												<td className="px-4 py-3">
													<div className="flex gap-2">
														<button className="text-blue-600" onClick={() => navigate(`/courses/${id}/grades/${a.id}`)}>
															Enter Grades
														</button>
														<button className="text-gray-600" onClick={() => handleEditClick(a)}>
															Edit
														</button>
														{gradesExist(a.id) ? (
															<button className="text-red-600 opacity-50 cursor-not-allowed" title="Contact admin to delete" disabled>
																Delete
															</button>
														) : (
															<button className="text-red-600" onClick={() => setDeleteTarget(a)}>
																Delete
															</button>
														)}
													</div>
												</td>
											</tr>
										),
									)}
								</tbody>
							</table>
						)}
					</div>
				</div>
			)}

			{activeTab === 'analytics' && <DashboardWidgets termId={courseTermId} courseId={id || null} />}

			{/* Confirm Dialogs */}
			<ConfirmDialog
				isOpen={!!maxScoreConfirm}
				title="Recompute Grades?"
				message="This will update all student scores for this assignment."
				onConfirm={() => {
					if (maxScoreConfirm) {
						updateMut.mutate({
							aid: maxScoreConfirm.assignmentId,
							body: maxScoreConfirm.body,
						});
					}
				}}
				onCancel={() => setMaxScoreConfirm(null)}
			/>

			<ConfirmDialog isOpen={!!deleteTarget} title="Delete Assignment" message={`Delete assignment ${deleteTarget?.name}?`} onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)} onCancel={() => setDeleteTarget(null)} />
		</div>
	);
};

export default TeacherCourseDetailPage;
