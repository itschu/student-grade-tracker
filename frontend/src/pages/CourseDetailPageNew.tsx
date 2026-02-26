import React, { useMemo, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import { useToast } from '../contexts/ToastContext';
import ConfirmDialog from '../components/shared/ConfirmDialog';

const CourseDetailPageNew: React.FC = () => {
	const { id } = useParams();
	const location = useLocation();
	const navigate = useNavigate();
	const qc = useQueryClient();
	const { showSuccess, showError } = useToast();

	const courseFromState = (location.state as any)?.course;
	const termName = (location.state as any)?.termName;
	const teacherName = (location.state as any)?.teacherName;

	const studentsQ = useQuery({ queryKey: ['courses', id, 'students'], queryFn: () => client.get(`/api/v1/courses/${id}/students`).then((r) => r.data) });
	const assignmentsQ = useQuery({ queryKey: ['assignments', id], queryFn: () => client.get(`/api/v1/assignments?course_id=${id}`).then((r) => r.data), enabled: !!id, retry: false });
	const teachersQ = useQuery({ queryKey: ['users', 'teacher'], queryFn: () => client.get('/api/v1/users?role=teacher').then((r) => r.data) });
	const studentsAllQ = useQuery({ queryKey: ['users', 'student'], queryFn: () => client.get('/api/v1/users?role=student').then((r) => r.data) });

	const enrollMut = useMutation({
		mutationFn: (body: any) => client.post(`/api/v1/courses/${id}/students`, body).then((r) => r.data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['courses', id, 'students'] });
			showSuccess('Enrolled');
		},
		onError: (e: any) => showError(e?.response?.data?.error || 'Failed'),
	});
	const removeMut = useMutation({
		mutationFn: (student_id: string) => client.delete(`/api/v1/courses/${id}/students/${student_id}`).then((r) => r.data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['courses', id, 'students'] });
			showSuccess('Removed');
		},
		onError: (e: any) => showError(e?.response?.data?.error || 'Failed'),
	});
	const deleteCourseMut = useMutation({
		mutationFn: () => client.delete(`/api/v1/courses/${id}`).then((r) => r.data),
		onSuccess: () => {
			showSuccess('Course deleted');
			navigate('/courses');
		},
		onError: (e: any) => {
			if (e?.response?.status === 409) showError('Cannot delete: grades have been entered');
			else showError('Failed to delete');
		},
	});
	const deleteAssignMut = useMutation({
		mutationFn: (aid: string) => client.delete(`/api/v1/assignments/${aid}`).then((r) => r.data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['assignments', id] });
			showSuccess('Assignment deleted');
		},
		onError: (e: any) => {
			if (e?.response?.status === 409) showError('Cannot delete: grades have been entered');
			else showError('Failed to delete');
		},
	});

	const [enrollOpen, setEnrollOpen] = useState(false);
	const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
	const [removeTarget, setRemoveTarget] = useState<any | null>(null);
	const [deleteCourseConfirm, setDeleteCourseConfirm] = useState(false);
	const [deleteAssignmentTarget, setDeleteAssignmentTarget] = useState<any | null>(null);

	const course = courseFromState;

	return (
		<div>
			<div className="mb-4">
				<button className="text-sm underline" onClick={() => navigate('/courses')}>
					Back
				</button>
			</div>
			<h1 className="text-2xl font-bold mb-2">{course?.name || 'Course'}</h1>
			<div className="mb-6 text-sm text-gray-600">
				Term: {termName || '-'} | Teacher: {teacherName || '-'}
			</div>

			<section className="mb-8">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg font-semibold">Enrolled Students</h2>
					<div>
						<button className="px-3 py-1 bg-[#2c3e50] text-white rounded" onClick={() => setEnrollOpen(true)}>
							+ Enroll Students
						</button>
					</div>
				</div>
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm">
					{studentsQ.isLoading ? (
						<div className="p-8 flex justify-center">
							<div className="animate-spin h-8 w-8 border-4 border-[#2c3e50] border-t-transparent rounded-full" />
						</div>
					) : studentsQ.isError ? (
						<div className="p-6 text-red-600">Failed to load.</div>
					) : (
						<table className="w-full">
							<thead>
								<tr className="bg-gray-50">
									<th className="px-4 py-3 text-left">Name</th>
									<th className="px-4 py-3 text-left">Email</th>
									<th className="px-4 py-3 text-left">Actions</th>
								</tr>
							</thead>
							<tbody>
								{(studentsQ.data?.students || []).map((s: any) => (
									<tr key={s.id} className="border-t">
										<td className="px-4 py-3">{s.full_name}</td>
										<td className="px-4 py-3">{s.email}</td>
										<td className="px-4 py-3">
											<button className="text-red-600" onClick={() => setRemoveTarget(s)}>
												Remove
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</div>
			</section>

			<section className="mb-8">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg font-semibold">Assignments</h2>
				</div>
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm">
					{assignmentsQ.isLoading ? (
						<div className="p-8 flex justify-center">
							<div className="animate-spin h-8 w-8 border-4 border-[#2c3e50] border-t-transparent rounded-full" />
						</div>
					) : assignmentsQ.isError ? (
						<div className="p-6 text-gray-600">Assignments not available.</div>
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
								{(assignmentsQ.data || []).map((a: any) => (
									<tr key={a.id} className="border-t">
										<td className="px-4 py-3">{a.name}</td>
										<td className="px-4 py-3">{a.type}</td>
										<td className="px-4 py-3">{a.max_points}</td>
										<td className="px-4 py-3">{a.due_date || '-'}</td>
										<td className="px-4 py-3">
											<button className="text-red-600" onClick={() => setDeleteAssignmentTarget(a)}>
												Delete
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</div>
			</section>

			<div className="mt-8">
				<button className="px-4 py-2 border border-red-300 text-red-600 rounded" onClick={() => setDeleteCourseConfirm(true)}>
					Delete Course
				</button>
			</div>

			{enrollOpen && (
				<div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center">
					<div className="bg-white rounded-lg p-6 w-[640px] shadow-xl max-h-[80vh] overflow-y-auto">
						<h2 className="text-lg font-semibold mb-4">Enroll Students</h2>
						<div className="mb-4">
							{(studentsAllQ.data || [])
								.filter((u: any) => !(studentsQ.data?.students || []).find((s: any) => s.id === u.id))
								.map((u: any) => (
									<div key={u.id} className="flex items-center gap-2 mb-2">
										<input
											type="checkbox"
											onChange={(e) => {
												if (e.target.checked) setSelectedStudentIds((prev) => [...prev, u.id]);
												else setSelectedStudentIds((prev) => prev.filter((x) => x !== u.id));
											}}
										/>
										<div>
											{u.full_name} — {u.email}
										</div>
									</div>
								))}
						</div>
						<div className="flex justify-end gap-2">
							<button className="px-4 py-2 border rounded" onClick={() => setEnrollOpen(false)}>
								Cancel
							</button>
							<button
								className="px-4 py-2 bg-[#2c3e50] text-white rounded"
								onClick={() => {
									enrollMut.mutate({ student_ids: selectedStudentIds });
									setEnrollOpen(false);
									setSelectedStudentIds([]);
								}}
							>
								Enroll Selected
							</button>
						</div>
					</div>
				</div>
			)}

			<ConfirmDialog isOpen={!!removeTarget} title="Remove Student" message={`Remove ${removeTarget?.full_name} from this course?`} onConfirm={() => removeTarget && removeMut.mutate(removeTarget.id)} onCancel={() => setRemoveTarget(null)} />
			<ConfirmDialog
				isOpen={deleteCourseConfirm}
				title="Delete Course"
				message="Delete this course? This action cannot be undone."
				onConfirm={() => {
					deleteCourseMut.mutate();
					setDeleteCourseConfirm(false);
				}}
				onCancel={() => setDeleteCourseConfirm(false)}
			/>
			<ConfirmDialog isOpen={!!deleteAssignmentTarget} title="Delete Assignment" message={`Delete assignment ${deleteAssignmentTarget?.name}?`} onConfirm={() => deleteAssignmentTarget && deleteAssignMut.mutate(deleteAssignmentTarget.id)} onCancel={() => setDeleteAssignmentTarget(null)} />
		</div>
	);
};

export default CourseDetailPageNew;
