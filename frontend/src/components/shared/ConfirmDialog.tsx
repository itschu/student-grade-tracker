import React from 'react';

interface ConfirmDialogProps {
	isOpen: boolean;
	title: string;
	message: string;
	onConfirm: () => void;
	onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ isOpen, title, message, onConfirm, onCancel }) => {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center">
			<div className="bg-white rounded-lg p-6 w-80 shadow-xl">
				<h2 className="text-lg font-semibold mb-4">{title}</h2>
				<p className="mb-6">{message}</p>
				<div className="flex justify-end gap-2">
					<button onClick={onCancel} className="px-4 py-2 border rounded">
						Cancel
					</button>
					<button onClick={onConfirm} className="px-4 py-2 bg-[#2c3e50] text-white rounded">
						Confirm
					</button>
				</div>
			</div>
		</div>
	);
};

export default ConfirmDialog;
