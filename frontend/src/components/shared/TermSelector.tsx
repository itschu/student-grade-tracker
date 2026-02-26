import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import client from '../../api/client';
import { useTerm, Term } from '../../contexts/TermContext';

const fetchTerms = async () => {
	const resp = await client.get('/api/v1/terms');
	return resp.data;
};

const TermSelector: React.FC = () => {
	const { activeTerm, setActiveTerm } = useTerm();
	const { data, isLoading } = useQuery(['terms'], fetchTerms);

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
