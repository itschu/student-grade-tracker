import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ExportButton from './ExportButton';

interface Props {
	termId: string;
	courseId: string | null;
}

const DashboardWidgets: React.FC<Props> = ({ termId, courseId }) => {
	const qc = useQueryClient();
	const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

	const analyticsQ = useQuery({
		queryKey: ['analytics', termId, courseId],
		queryFn: () => client.get(`/api/v1/analytics/dashboard?term_id=${termId}${courseId ? '&course_id=' + courseId : ''}`).then((r) => r.data),
		enabled: !!termId,
		staleTime: Infinity,
	});

	useEffect(() => {
		if (analyticsQ.data) setLastUpdated(new Date());
	}, [analyticsQ.data]);

	if (analyticsQ.isLoading) {
		return (
			<div className="flex justify-center p-12">
				<div className="animate-spin h-8 w-8 border-4 border-[#2c3e50] border-t-transparent rounded-full" />
			</div>
		);
	}

	if (analyticsQ.isError) {
		return (
			<div className="p-6 text-red-600 bg-white rounded-lg border border-gray-200 shadow-sm">
				Failed to load analytics.{' '}
				<button className="ml-2 px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50" onClick={() => qc.invalidateQueries({ queryKey: ['analytics', termId, courseId] })}>
					Refresh
				</button>
			</div>
		);
	}

	const data = analyticsQ.data || {};

	return (
		<div>
			<div className="flex items-center justify-between mb-4">
				<div />
				<div className="flex items-center gap-3">
					<span className="text-xs text-gray-400">Last updated: {lastUpdated?.toLocaleTimeString()}</span>
					<button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50" onClick={() => qc.invalidateQueries({ queryKey: ['analytics', termId, courseId] })}>
						Refresh
					</button>
					<ExportButton courseId={courseId} />
				</div>
			</div>

			{/* Summary cards */}
			<div className="grid grid-cols-3 gap-4 mb-6">
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 flex flex-col">
					<div className="text-sm text-gray-500">Total Students</div>
					<div className="text-3xl font-bold text-[#2c3e50]">{data.summary?.total_students ?? '—'}</div>
				</div>
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 flex flex-col">
					<div className="text-sm text-gray-500">Total Courses</div>
					<div className="text-3xl font-bold text-[#2c3e50]">{data.summary?.total_courses ?? '—'}</div>
				</div>
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 flex flex-col">
					<div className="text-sm text-gray-500">School/Class Average</div>
					<div className="text-3xl font-bold text-[#2c3e50]">{data.summary?.average_grade !== undefined && data.summary?.average_grade !== null ? `${Number(data.summary.average_grade).toFixed(1)}%` : '—'}</div>
				</div>
			</div>

			{/* Charts row */}
			<div className="grid grid-cols-2 gap-4 mb-6">
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
					<h3 className="text-lg font-semibold mb-4">Grade Distribution</h3>
					<ResponsiveContainer width="100%" height={300}>
						<BarChart data={data.grade_distribution || []}>
							<CartesianGrid strokeDasharray="3 3" />
							<XAxis dataKey="band" />
							<YAxis />
							<Tooltip />
							<Bar dataKey="count" fill="#2c3e50" />
						</BarChart>
					</ResponsiveContainer>
				</div>

				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
					<h3 className="text-lg font-semibold mb-4">Grade Trend by Term</h3>
					<ResponsiveContainer width="100%" height={300}>
						<LineChart data={data.trend || []}>
							<CartesianGrid strokeDasharray="3 3" />
							<XAxis dataKey="term_name" />
							<YAxis domain={[0, 100]} />
							<Tooltip />
							<Line type="monotone" dataKey="average_grade" stroke="#2c3e50" dot />
						</LineChart>
					</ResponsiveContainer>
				</div>
			</div>

			{/* Course Rankings (only when not scoping to a course) */}
			{!courseId && (
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
					<h3 className="text-lg font-semibold mb-4">Course Rankings</h3>
					<table className="w-full">
						<thead>
							<tr>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">Rank</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">Course Name</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">Average Grade</th>
							</tr>
						</thead>
						<tbody>
							{(data.course_rankings || []).map((row: any, i: number) => (
								<tr key={row.course_id} className="border-t">
									<td className="px-4 py-3 text-sm text-gray-700">{i + 1}</td>
									<td className="px-4 py-3 text-sm text-gray-700">{row.name}</td>
									<td className="px-4 py-3 text-sm text-gray-700">{row.average_grade !== undefined && row.average_grade !== null ? `${Number(row.average_grade).toFixed(1)}%` : '—'}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{/* Assignment Averages (only when courseId is provided) */}
			{!!courseId && (
				<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
					<h3 className="text-lg font-semibold mb-4">Assignment Averages</h3>
					<table className="w-full">
						<thead>
							<tr>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">Assignment Name</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">Class Average</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">Max Points</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">Average %</th>
							</tr>
						</thead>
						<tbody>
							{(data.assignment_averages || []).map((row: any) => (
								<tr key={row.assignment_id} className="border-t">
									<td className="px-4 py-3 text-sm text-gray-700">{row.name}</td>
									<td className="px-4 py-3 text-sm text-gray-700">{row.average_score !== undefined && row.average_score !== null ? `${Number(row.average_score).toFixed(1)}` : '—'}</td>
									<td className="px-4 py-3 text-sm text-gray-700">{row.max_points}</td>
									<td className="px-4 py-3 text-sm text-gray-700">{row.max_points > 0 && row.average_score !== null ? `${((row.average_score / row.max_points) * 100).toFixed(1)}%` : '—'}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
};

export default DashboardWidgets;
