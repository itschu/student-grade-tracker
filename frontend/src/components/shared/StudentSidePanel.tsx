import React from 'react';
import { useQuery } from '@tanstack/react-query';
import client from '../../api/client';

interface StudentSidePanelProps {
	studentId: string;
	courseId: string;
	studentName: string;
	onClose: () => void;
}

const StudentSidePanel: React.FC<StudentSidePanelProps> = ({ studentId, courseId, studentName, onClose }) => {
	const studentGradesQ = useQuery({
		queryKey: ['grades', 'student', courseId, studentId],
		queryFn: () => client.get(`/api/v1/grades/student?course_id=${courseId}&student_id=${studentId}`).then((r) => r.data),
		enabled: !!(courseId && studentId),
	});

	return (
		<>
			{/* Backdrop */}
			<div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

			{/* Panel */}
			<div className="fixed right-0 top-0 h-full w-[420px] bg-white shadow-xl z-50 flex flex-col overflow-hidden">
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b">
					<h2 className="text-xl font-bold">{studentName}</h2>
					<button className="text-2xl font-bold" onClick={onClose}>
						&times;
					</button>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto p-4">
					{studentGradesQ.isLoading ? (
						<div className="flex justify-center items-center h-full">
							<div className="animate-spin h-8 w-8 border-4 border-[#2c3e50] border-t-transparent rounded-full" />
						</div>
					) : studentGradesQ.isError ? (
						<div className="text-red-600 p-4">Failed to load student grades.</div>
					) : (
						<>
							{/* Final Grade */}
							<div className="mb-6 p-4 bg-blue-50 rounded-lg">
								<div className="text-sm text-gray-600">Final Grade</div>
								<div className="text-2xl font-bold">{studentGradesQ.data?.display_grade || '—'}</div>
							</div>

							{/* Assignments Table */}
							<h3 className="font-semibold mb-2">Assignments</h3>
							<table className="w-full text-sm">
								<thead>
									<tr className="bg-gray-50">
										<th className="px-2 py-2 text-left">Assignment</th>
										<th className="px-2 py-2 text-left">Type</th>
										<th className="px-2 py-2 text-left">Score</th>
										<th className="px-2 py-2 text-left">Max</th>
										<th className="px-2 py-2 text-left">%</th>
									</tr>
								</thead>
								<tbody>
									{studentGradesQ.data?.assignments?.map((assignment: any) => {
										const percentage = assignment.max_points > 0 && assignment.earned_points !== null ? ((assignment.earned_points / assignment.max_points) * 100).toFixed(1) + '%' : '—';

										return (
											<tr key={assignment.id} className="border-t">
												<td className="px-2 py-2">{assignment.name}</td>
												<td className="px-2 py-2">{assignment.type}</td>
												<td className="px-2 py-2">{assignment.earned_points !== null ? assignment.earned_points : '—'}</td>
												<td className="px-2 py-2">{assignment.max_points}</td>
												<td className="px-2 py-2">{percentage}</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</>
					)}
				</div>
			</div>
		</>
	);
};

export default StudentSidePanel;
