import React, { createContext, useContext, useState, ReactNode } from 'react';
import Toast from '../components/shared/Toast';

export interface ToastMessage {
	id: number;
	type: 'success' | 'error';
	message: string;
}

interface ToastContextValue {
	showSuccess: (msg: string) => void;
	showError: (msg: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const [messages, setMessages] = useState<ToastMessage[]>([]);

	const removeMessage = (id: number) => {
		setMessages((prev) => prev.filter((m) => m.id !== id));
	};

	const showSuccess = (msg: string) => {
		const id = Date.now();
		setMessages((prev) => [...prev, { id, type: 'success', message: msg }]);
		setTimeout(() => removeMessage(id), 3000);
	};

	const showError = (msg: string) => {
		const id = Date.now();
		setMessages((prev) => [...prev, { id, type: 'error', message: msg }]);
		setTimeout(() => removeMessage(id), 3000);
	};

	return (
		<ToastContext.Provider value={{ showSuccess, showError }}>
			{children}
			<div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
				{messages.map((m) => (
					<Toast key={m.id} message={m} />
				))}
			</div>
		</ToastContext.Provider>
	);
};

export const useToast = (): ToastContextValue => {
	const ctx = useContext(ToastContext);
	if (!ctx) {
		throw new Error('useToast must be used within a ToastProvider');
	}
	return ctx;
};
