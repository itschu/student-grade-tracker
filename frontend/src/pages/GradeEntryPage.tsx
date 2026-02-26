import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import { useToast } from '../contexts/ToastContext';
import StudentSidePanel from '../components/shared/StudentSidePanel';

const GradeEntryPage: React.FC = () => {
	const { courseId, assignmentId } = useParams();
	const navigate = useNavigate();
	const qc = useQueryClient();
	const { showSuccess, showError } = useToast();
	const inputRefs = useRef<Array<React.RefObject<HTMLInputElement>>>([]);

	// Data fetching
	const assignmentsQ = useQuery({
		queryKey: ['assignments', courseId],
		queryFn: () => client.get(`/api/v1/assignments?course_id=${courseId}`).then((r) => r.data),
		enabled: !!courseId,
	});

	const gradesQ = useQuery({
		queryKey: ['grades', assignmentId, courseId],
		queryFn: () => client.get(`/api/v1/grades?assignment_id=${assignmentId}&course_id=${courseId}`).then((r) => r.data),
		enabled: !!(assignmentId && courseId),
	});

	// Find the specific assignment from the assignments list
	const assignment = assignmentsQ.data?.find((a: any) => a.id === assignmentId);

	// Local state
	const [localScores, setLocalScores] = useState<Record<string, string>>({});
	const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
	const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string } | null>(null);
	const [warnings, setWarnings] = useState<string[]>([]);

	// Initialize local scores when grades data loads
	useEffect(() => {
		if (gradesQ.data?.students) {
			const initialScores: Record<string, string> = {};
			gradesQ.data.students.forEach((student: any) => {
				initialScores[student.student_id] = student.earned_points !== null ? String(student.earned_points) : '';
			});
			setLocalScores(initialScores);
			setDirtyIds(new Set());
			setWarnings([]);
		}
	}, [gradesQ.data]);

	// Handle score change
	const handleScoreChange = (studentId: string, value: string) => {
		setLocalScores((prev) => ({ ...prev, [studentId]: value }));

		// Add to dirtyIds if not already there
		if (!dirtyIds.has(studentId)) {
			setDirtyIds((prev) => new Set(prev).add(studentId));
		}
	};

	// Handle tab navigation
	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, currentIndex: number) => {
		if (e.key === 'Tab') {
			e.preventDefault();
			const nextIndex = currentIndex + 1;
			if (nextIndex < inputRefs.current.length && inputRefs.current[nextIndex]?.current) {
				inputRefs.current[nextIndex].current!.focus();
			}
		}
	};

	// Save mutation
	const saveMut = useMutation({
		mutationFn: (payload: { assignment_id: number | string; course_id: number | string; grades: Array<{ student_id: number | string; earned_points: number }> }) => client.put('/api/v1/grades/bulk', payload).then((r) => r.data),
		onSuccess: (data) => {
			// Clear dirty states
			setDirtyIds(new Set());

			// Handle warnings if any
			if (data?.warnings?.length) {
				setWarnings(data.warnings);
			} else {
				setWarnings([]);
				showSuccess('Grades saved');
			}

			// Refresh grades data
			qc.invalidateQueries({ queryKey: ['grades', assignmentId, courseId] });
		},
		onError: (e: any) => showError(e?.response?.data?.error || 'Failed to save grades'),
	});

	// Cancel changes
	const handleCancel = () => {
		// Reinitialize from grades data
		if (gradesQ.data?.students) {
			const initialScores: Record<string, string> = {};
			gradesQ.data.students.forEach((student: any) => {
				initialScores[student.student_id] = student.earned_points !== null ? String(student.earned_points) : '';
			});
			setLocalScores(initialScores);
			setDirtyIds(new Set());
			setWarnings([]);
		}
	};

	// Prepare input refs for each student
	useEffect(() => {
		if (gradesQ.data?.students) {
			inputRefs.current = gradesQ.data.students.map(() => React.createRef<HTMLInputElement>());
		}
	}, [gradesQ.data?.students]);

	return (
		<div>
			{/* Breadcrumb */}
			<div className="mb-4">
				<button className="text-sm underline" onClick={() => navigate(-1)}>
					← Back to Assignments
				</button>
			</div>

			{/* Assignment Info Card */}
			{assignment && (
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-6">
					<h2 className="text-xl font-bold mb-2">{assignment.name}</h2>
					<div className="grid grid-cols-4 gap-4 text-sm">
						<div>
							<div className="text-gray-600">Type</div>
							<div className="font-medium">{assignment.type}</div>
						</div>
						<div>
							<div className="text-gray-600">Max Score</div>
							<div className="font-medium">{assignment.max_points}</div>
						</div>
						<div>
							<div className="text-gray-600">Due Date</div>
							<div className="font-medium">{assignment.due_date || '-'}</div>
						</div>
					</div>
				</div>
			)}

			{/* Warning Banner */}
			{warnings.length > 0 && (
				<div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded mb-6">
					<strong>Warning:</strong> Some scores were adjusted due to max point changes:
					<ul className="list-disc pl-5 mt-1">
						{warnings.map((warning, i) => (
							<li key={i}>{warning}</li>
						))}
					</ul>
				</div>
			)}

			{/* Action Bar */}
			<div className="flex justify-end gap-2 mb-4">
				<button className="px-4 py-2 border rounded" onClick={handleCancel}>
					Cancel
				</button>
				<button
					className="px-4 py-2 bg-[#2c3e50] text-white rounded flex items-center disabled:opacity-50"
					disabled={dirtyIds.size === 0 || saveMut.isPending}
					onClick={() => {
						// Prepare grades to save — only include students with numeric values
						const gradesArray: Array<{ student_id: number | string; earned_points: number }> = Array.from(dirtyIds)
							.map((studentId) => ({
								student_id: Number(studentId),
								earned_points: localScores[studentId] !== '' ? Number(localScores[studentId]) : NaN,
							}))
							.filter((g) => !Number.isNaN(g.earned_points));

						const payload = {
							assignment_id: Number(assignmentId),
							course_id: Number(courseId),
							grades: gradesArray,
						};

						saveMut.mutate(payload);
					}}
				>
					{saveMut.isPending && <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>}
					Save Grades
				</button>
			</div>

			{/* Grades Table */}
			<div className="bg-white rounded-lg border border-gray-200 shadow-sm">
				{gradesQ.isLoading || assignmentsQ.isLoading ? (
					<div className="p-8 flex justify-center">
						<div className="animate-spin h-8 w-8 border-4 border-[#2c3e50] border-t-transparent rounded-full" />
					</div>
				) : gradesQ.isError || assignmentsQ.isError ? (
					<div className="p-6 text-red-600">
						Failed to load grades.{' '}
						<button
							onClick={() => {
								gradesQ.refetch();
								assignmentsQ.refetch();
							}}
							className="underline"
						>
							Retry
						</button>
					</div>
				) : assignment && gradesQ.data?.students ? (
					<table className="w-full">
						<thead>
							<tr className="bg-gray-50">
								<th className="px-4 py-3 text-left">Student Name</th>
								<th className="px-4 py-3 text-left">Score</th>
								<th className="px-4 py-3 text-left">Max Score</th>
								<th className="px-4 py-3 text-left">Percentage</th>
								<th className="px-4 py-3 text-left">Current Final Grade</th>
							</tr>
						</thead>
						<tbody>
							{gradesQ.data.students.map((student: any, index: number) => {
								const percentage = localScores[student.student_id] !== '' ? ((Number(localScores[student.student_id]) / assignment.max_points) * 100).toFixed(1) + '%' : '—';

								return (
									<tr key={student.student_id} className="border-t">
										<td className="px-4 py-3">
											<button className="text-blue-600 hover:underline" onClick={() => setSelectedStudent({ id: student.student_id, name: student.full_name })}>
												{student.full_name}
											</button>
										</td>
										<td className="px-4 py-3">
											<input
												ref={inputRefs.current[index]}
												type="number"
												min="0"
												max={assignment.max_points}
												value={localScores[student.student_id] || ''}
												onChange={(e) => handleScoreChange(student.student_id, e.target.value)}
												onKeyDown={(e) => handleKeyDown(e, index)}
												className={`w-24 border px-2 py-1 ${dirtyIds.has(student.student_id) ? 'bg-yellow-50 border-yellow-400' : 'border-gray-300'}`}
											/>
										</td>
										<td className="px-4 py-3">{assignment.max_points}</td>
										<td className="px-4 py-3">{percentage}</td>
										<td className="px-4 py-3">{student.final_grade_percentage !== undefined && student.final_grade_percentage !== null ? `${Number(student.final_grade_percentage).toFixed(1)}%` : '—'}</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				) : (
					<div className="p-6 text-gray-600">No grade data available.</div>
				)}
			</div>

			{/* Student Side Panel */}
			{selectedStudent && <StudentSidePanel studentId={selectedStudent.id} courseId={courseId!} studentName={selectedStudent.name} onClose={() => setSelectedStudent(null)} />}
		</div>
	);
};

export default GradeEntryPage;
