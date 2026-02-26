import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import { useTerm } from '../contexts/TermContext';
import { useToast } from '../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const CoursesPage: React.FC = () => {
	const qc = useQueryClient();
	const { showSuccess, showError } = useToast();
	const { activeTerm } = useTerm();
	const { state } = useAuth();
	const navigate = useNavigate();

	const [newOpen, setNewOpen] = useState(false);
	const [newCourse, setNewCourse] = useState<any>({ name: '', term_id: activeTerm?.id || '', teacher_id: '' });

	const termsQ = useQuery({ queryKey: ['terms'], queryFn: () => client.get('/api/v1/terms').then((r) => r.data) });
	const teachersQ = useQuery({ queryKey: ['users', 'teacher'], queryFn: () => client.get('/api/v1/users?role=teacher').then((r) => r.data) });

	const coursesQ = useQuery({
		queryKey: ['courses', activeTerm?.id],
		enabled: !!activeTerm,
		queryFn: () => client.get(`/api/v1/courses?term_id=${activeTerm?.id}`).then((r) => r.data),
	});

	const createMut = useMutation({
		mutationFn: (b: any) => client.post('/api/v1/courses', b).then((r) => r.data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['courses'] });
			showSuccess('Course created');
			setNewOpen(false);
		},
		onError: (e: any) => showError(e?.response?.data?.error || 'Failed to create'),
	});

	const list = useMemo(() => {
		if (!coursesQ.data) return [];
		if (state?.role === 'teacher') {
			return coursesQ.data.filter((c: any) => c.teacher_id === state.user_id);
		}
		return coursesQ.data;
	}, [coursesQ.data, state]);

	const isTeacher = state?.role === 'teacher';

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-bold">Courses</h1>
					<div className="text-sm text-gray-600">{activeTerm ? `Active term: ${activeTerm.name}` : 'No active term selected'}</div>
				</div>
				{!isTeacher && (
					<button className="px-4 py-2 bg-[#2c3e50] text-white rounded" onClick={() => setNewOpen(true)}>
						+ New Course
					</button>
				)}
			</div>

			<div className="bg-white rounded-lg border border-gray-200 shadow-sm">
				{coursesQ.isLoading ? (
					<div className="p-8 flex justify-center">
						<div className="animate-spin h-8 w-8 border-4 border-[#2c3e50] border-t-transparent rounded-full" />
					</div>
				) : coursesQ.isError ? (
					<div className="p-6 text-red-600">
						Failed to load.{' '}
						<button onClick={() => coursesQ.refetch()} className="underline">
							Retry
						</button>
					</div>
				) : (
					<table className="w-full">
						<thead>
							<tr className="bg-gray-50">
								<th className="px-4 py-3 text-left">Course Name</th>
								<th className="px-4 py-3 text-left">Term</th>
								{isTeacher ? (
									<>
										<th className="px-4 py-3 text-left">Enrolled</th>
										<th className="px-4 py-3 text-left">Class Average</th>
									</>
								) : (
									<th className="px-4 py-3 text-left">Teacher</th>
								)}
							</tr>
						</thead>
						<tbody>
							{list.map((c: any) => (
								<tr
									key={c.id}
									className="border-t hover:bg-gray-50 cursor-pointer"
									onClick={() => {
										if (isTeacher) {
											navigate(`/teacher/courses/${c.id}`, { state: { course: c } });
										} else {
											navigate(`/courses/${c.id}`, { state: { course: c } });
										}
									}}
								>
									<td className="px-4 py-3">{c.name}</td>
									<td className="px-4 py-3">{termsQ.data?.find((t: any) => t.id === c.term_id)?.name || '-'}</td>
									{isTeacher ? (
										<>
											<td className="px-4 py-3">{c.student_count !== undefined ? c.student_count : '-'}</td>
											<td className="px-4 py-3">{c.class_average !== undefined ? c.class_average.toFixed(1) : '-'}</td>
										</>
									) : (
										<td className="px-4 py-3">{teachersQ.data?.find((u: any) => u.id === c.teacher_id)?.full_name || '-'}</td>
									)}
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>

			{newOpen && (
				<div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center">
					<div className="bg-white rounded-lg p-6 w-[480px] shadow-xl">
						<h2 className="text-lg font-semibold mb-4">New Course</h2>
						<form
							onSubmit={(e) => {
								e.preventDefault();
								createMut.mutate(newCourse);
							}}
						>
							<label className="block text-sm font-medium text-gray-700 mb-1">Course Name</label>
							<input className="w-full border px-3 py-2 mb-3" value={newCourse.name} onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })} />
							<label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
							<select className="w-full border px-3 py-2 mb-3" value={newCourse.term_id} onChange={(e) => setNewCourse({ ...newCourse, term_id: e.target.value })}>
								{(termsQ.data || []).map((t: any) => (
									<option key={t.id} value={t.id}>
										{t.name}
									</option>
								))}
							</select>
							<label className="block text-sm font-medium text-gray-700 mb-1">Teacher</label>
							<select className="w-full border px-3 py-2 mb-4" value={newCourse.teacher_id} onChange={(e) => setNewCourse({ ...newCourse, teacher_id: e.target.value })}>
								{(teachersQ.data || []).map((u: any) => (
									<option key={u.id} value={u.id}>
										{u.full_name}
									</option>
								))}
							</select>
							<div className="flex justify-end gap-2">
								<button type="button" onClick={() => setNewOpen(false)} className="px-4 py-2 border rounded">
									Cancel
								</button>
								<button type="submit" className="px-4 py-2 bg-[#2c3e50] text-white rounded">
									Create
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
};

export default CoursesPage;
