import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import client from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useTerm } from '../contexts/TermContext';

// local interfaces
interface Course {
	id: string;
	name: string;
	teacher_name?: string;
}

interface AssignmentGrade {
	id: string;
	name: string;
	type: string;
	earned_points: number | null;
	max_points: number;
}

interface GradeData {
	assignments: AssignmentGrade[];
	final_grade_percentage: number;
	display_grade: string;
}

// CourseCard component
interface CourseCardProps {
	course: Course;
	isExpanded: boolean;
	isFetched: boolean;
	userId: string;
	onToggle: () => void;
}

const CourseCard: React.FC<CourseCardProps> = ({
	course,
	isExpanded,
	isFetched,
	userId,
	onToggle,
}) => {
	const gradeQuery = useQuery<GradeData>({
		queryKey: ['grades', 'student', course.id, userId],
		queryFn: () =>
			client
				.get(`/api/v1/grades/student?course_id=${course.id}&student_id=${userId}`)
				.then((r) => r.data),
		enabled: isExpanded && !!userId,
	});

	return (
		<div>
			{/* header */}
			<div
				className="flex items-center justify-between px-4 py-4 cursor-pointer hover:bg-gray-50"
			onClick={onToggle}
			>
				<div>
					<div className="font-semibold">{course.name}</div>
					{course.teacher_name && (
						<div className="text-sm text-gray-500">{course.teacher_name}</div>
					)}
				</div>
				<div className="flex items-center gap-2">
					{isFetched && gradeQuery.data && (
						<span className="px-3 py-1 rounded-full text-sm font-semibold bg-[#2c3e50] text-white">
							{gradeQuery.data.display_grade}
						</span>
					)}
					<span className="text-gray-600">
						{isExpanded ? '▲' : '▼'}
					</span>
				</div>
			</div>

			{/* expanded body */}
			{isExpanded && (
				<div>
					{gradeQuery.isError ? (
						<div className="px-4 py-4 text-red-600">
							Failed to load grades.{' '}
							<button onClick={() => gradeQuery.refetch()} className="underline">
								Retry
							</button>
						</div>
					) : gradeQuery.isLoading ? (
						<div className="px-4 py-6 flex justify-center">
							<div className="animate-spin h-5 w-5 border-2 border-[#2c3e50] border-t-transparent rounded-full" />
						</div>
					) : gradeQuery.data ? (
						<>
							{gradeQuery.data.assignments.length === 0 ? (
								<div className="px-4 py-4 text-sm text-gray-500">No assignments yet.</div>
							) : (
								<table className="w-full border-collapse">
									<thead>
										<tr className="bg-gray-50">
											<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
												Assignment Name
											</th>
											<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
												Type
											</th>
											<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
												Score
											</th>
											<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
												Max
											</th>
											<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
												Percentage
											</th>
										</tr>
									</thead>
									<tbody>
										{gradeQuery.data.assignments.map((a) => (
											<tr key={a.id}>
												<td className="px-4 py-3 text-sm text-gray-700 border-t border-gray-100">
													{a.name}
												</td>
												<td className="px-4 py-3 text-sm text-gray-700 border-t border-gray-100">
												{a.type}
												</td>
												<td className={`${a.earned_points === null ? 'text-gray-400' : ''} px-4 py-3 text-sm text-gray-700 border-t border-gray-100`}>
												{a.earned_points === null ? '—' : a.earned_points}
												</td>
												<td className="px-4 py-3 text-sm text-gray-700 border-t border-gray-100">
												{a.max_points}
												</td>
												<td className={`${a.earned_points === null ? 'text-gray-400' : ''} px-4 py-3 text-sm text-gray-700 border-t border-gray-100`}>
												{a.earned_points === null
													? '0.0%'
													: ((a.earned_points / a.max_points) * 100).toFixed(1) + '%'}
												</td>
											</tr>
										))}
										<tr className="font-bold bg-gray-50">
											<td colSpan={4} className="px-4 py-3 text-sm text-gray-700 border-t border-gray-100">
												Final Grade
												</td>
											<td className="px-4 py-3 text-sm text-gray-700 border-t border-gray-100">
												{gradeQuery.data.display_grade}
												</td>
											</tr>
									</tbody>
								</table>
							)
						</>
					) : null}
				</div>
			)}
		</div>
	);
};

export default function MyGradesPage() {
	const { state } = useAuth();
	const userId = state?.user_id || '';
	const { activeTerm } = useTerm();
	const [selectedTermId, setSelectedTermId] = useState<string>(() => activeTerm?.id || '');
	const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
	const [fetchedIds, setFetchedIds] = useState<Set<string>>(() => new Set());

	useEffect(() => {
		if (activeTerm?.id) {
			setSelectedTermId(activeTerm.id);
			setExpandedIds(new Set());
			setFetchedIds(new Set());
		}
	}, [activeTerm]);

	const termsQuery = useQuery({
		queryKey: ['terms'],
		queryFn: () => client.get('/api/v1/terms').then((r) => r.data),
	});

	const coursesQuery = useQuery({
		queryKey: ['courses', selectedTermId],
		queryFn: () => client.get(`/api/v1/courses?term_id=${selectedTermId}`).then((r) => r.data),
		enabled: !!selectedTermId,
	});

	const handleTermChange = (termId: string) => {
		setSelectedTermId(termId);
		setExpandedIds(new Set());
		setFetchedIds(new Set());
	};

	const handleToggle = (courseId: string) => {
		setExpandedIds((prev) => {
			const next = new Set(prev);
			if (next.has(courseId)) {
				next.delete(courseId);
			} else {
				next.add(courseId);
				setFetchedIds((p) => {
					const n = new Set(p);
					n.add(courseId);
					return n;
				});
			}
			return next;
		});
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-bold">My Grades</h1>
				<select
					className="border px-3 py-2 rounded text-sm"
					value={selectedTermId}
					onChange={(e) => handleTermChange(e.target.value)}
					disabled={termsQuery.isLoading}
				>
					<option value="">Select term</option>
					{termsQuery.data?.map((t: any) => (
						<option key={t.id} value={t.id}>
							{t.name}
						</option>
					))}
				</select>
			</div>

			{coursesQuery.isLoading ? (
				<div className="p-8 flex justify-center">
					<div className="animate-spin h-8 w-8 border-4 border-[#2c3e50] border-t-transparent rounded-full" />
				</div>
			) : coursesQuery.isError ? (
				<div className="p-6 text-red-600">
					Failed to load.{' '}
					<button onClick={() => coursesQuery.refetch()} className="underline">
						Retry
					</button>
				</div>
			) : coursesQuery.data && coursesQuery.data.length === 0 ? (
				<div className="p-4 text-gray-600">No courses found for this term.</div>
			) : (
				coursesQuery.data?.map((course: Course) => (
					<div
						key={course.id}
						className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
					>
						<CourseCard
							course={course}
							isExpanded={expandedIds.has(course.id)}
							isFetched={fetchedIds.has(course.id)}
							userId={userId}
							onToggle={() => handleToggle(course.id)}
						/>
					</div>
				))
			)}
		</div>
	);
}

