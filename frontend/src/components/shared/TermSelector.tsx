import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import client from '../../api/client';
import { useTerm, Term } from '../../contexts/TermContext';
import { useAuth } from '../../contexts/AuthContext';

// fetch logic will depend on role (student vs admin/teacher)
const fetchTerms = async (isStudent: boolean) => {
	const url = isStudent ? '/api/v1/student/terms' : '/api/v1/terms';
	const resp = await client.get(url);
	return resp.data;
};

const TermSelector: React.FC = () => {
	const { activeTerm, setActiveTerm } = useTerm();
	const { state } = useAuth();
	const isStudent = state?.role === 'student';
	const { data, isLoading } = useQuery({
		queryKey: ['terms', isStudent ? 'student' : 'admin-teacher'],
		queryFn: () => fetchTerms(isStudent),
	});

	useEffect(() => {
		if (!activeTerm && data && Array.isArray(data)) {
			const first = data.find((t: any) => !t.is_archived);
			if (first) {
				setActiveTerm({ id: first.id, name: first.name });
			}
		}
	}, [activeTerm, data, setActiveTerm]);

	const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const selected = data.find((t: any) => t.id === e.target.value);
		if (selected) {
			setActiveTerm({ id: selected.id, name: selected.name });
		}
	};

	return (
		<select className="border px-2 py-1 rounded" disabled={isLoading} value={activeTerm?.id || ''} onChange={handleChange}>
			{isLoading && <option>Loading...</option>}
			{!isLoading &&
				data &&
				data.map((t: any) => (
					<option key={t.id} value={t.id}>
						{t.name}
					</option>
				))}
		</select>
	);
};

export default TermSelector;
