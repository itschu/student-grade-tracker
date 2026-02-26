import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import client from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useTerm } from '../contexts/TermContext';
import DashboardWidgets from '../components/shared/DashboardWidgets';

const DashboardPage: React.FC = () => {
	const { state } = useAuth();
	const { activeTerm } = useTerm();

	const [selectedTermId, setSelectedTermId] = useState<string>(activeTerm?.id ?? '');
	const [selectedCourseId, setSelectedCourseId] = useState<string>('');

	const termsQ = useQuery({ queryKey: ['terms'], queryFn: () => client.get('/api/v1/terms').then((r) => r.data) });

	useEffect(() => {
		if (!selectedTermId && activeTerm?.id) setSelectedTermId(activeTerm.id);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeTerm]);

	useEffect(() => {
		if (!selectedTermId && termsQ.data && termsQ.data.length > 0) {
			const first = termsQ.data.find((t: any) => !t.archived) || termsQ.data[0];
			if (first) setSelectedTermId(first.id);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [termsQ.data]);

	const coursesQ = useQuery({
		queryKey: ['courses', selectedTermId],
		queryFn: () => client.get('/api/v1/courses?term_id=' + selectedTermId).then((r) => r.data),
		enabled: !!selectedTermId,
	});

	const filteredCourses = useMemo(() => {
		if (!coursesQ.data) return [];
		if (state?.role === 'teacher') return coursesQ.data.filter((c: any) => c.teacher_id === state.user_id);
		return coursesQ.data;
	}, [coursesQ.data, state]);

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-bold">Dashboard</h1>
				<div className="flex items-center gap-3">
					<select
						value={selectedTermId}
						onChange={(e) => {
							setSelectedTermId(e.target.value);
							setSelectedCourseId('');
						}}
						className="border px-2 py-1 rounded text-sm"
					>
						{termsQ.data?.map((t: any) => (
							<option key={t.id} value={t.id}>
								{t.name}
							</option>
						))}
					</select>

					<select value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)} className="border px-2 py-1 rounded text-sm">
						<option value="">All Courses</option>
						{filteredCourses.map((c: any) => (
							<option key={c.id} value={c.id}>
								{c.name}
							</option>
						))}
					</select>
				</div>
			</div>

			{selectedTermId && <DashboardWidgets termId={selectedTermId} courseId={selectedCourseId || null} />}
		</div>
	);
};

export default DashboardPage;
