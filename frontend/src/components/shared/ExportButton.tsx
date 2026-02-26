import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../../contexts/ToastContext';
import client from '../../api/client';

interface ExportButtonProps {
	courseId: string | null;
	disabled?: boolean;
}

const ExportButton: React.FC<ExportButtonProps> = ({ courseId, disabled }) => {
	const { showError } = useToast();
	const [loading, setLoading] = useState(false);
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setDropdownOpen(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	const handleExport = async (format: 'csv' | 'pdf') => {
		if (!courseId) return;
		setLoading(true);
		setDropdownOpen(false);
		try {
			const response = await client.get('/api/v1/exports/gradebook', {
				params: { course_id: courseId, format },
				responseType: 'blob',
			});

			const blob = response.data;
			// extract filename from header if possible
			let filename = `gradebook_${courseId}.${format}`;
			const cd = response.headers['content-disposition'];
			if (cd) {
				const match = cd.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
				if (match && match[1]) {
					filename = match[1].replace(/['"]/g, '');
				}
			}

			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (err: any) {
			if (err.response?.status === 422) {
				try {
					const text = await err.response.data.text();
					const body = JSON.parse(text);
					showError(body.error || 'Export too large (max 30 students × 30 assignments)');
				} catch {
					showError('Export too large (max 30 students × 30 assignments)');
				}
			} else {
				showError('Export failed. Please try again.');
			}
		} finally {
			setLoading(false);
		}
	};

	const isDisabled = !courseId || !!disabled || loading;

	return (
		<div ref={containerRef} className="relative">
			<button
				disabled={isDisabled}
				title={!courseId ? 'Select a course to export' : undefined}
				onClick={() => {
					if (!isDisabled) setDropdownOpen((prev) => !prev);
				}}
				className={`relative px-4 py-2 bg-[#2c3e50] text-white text-sm font-medium rounded hover:bg-[#3d5166] flex items-center gap-2 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
			>
				{loading && <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
				Export ▾
			</button>

			{dropdownOpen && (
				<div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded shadow-lg z-50">
					<button onClick={() => handleExport('csv')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
						Export as CSV
					</button>
					<button onClick={() => handleExport('pdf')} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
						Export as PDF
					</button>
				</div>
			)}
		</div>
	);
};

export default ExportButton;
