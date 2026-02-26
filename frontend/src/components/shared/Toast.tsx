import React from 'react';
import { ToastMessage } from '../../contexts/ToastContext';

interface ToastProps {
	message: ToastMessage;
}

const Toast: React.FC<ToastProps> = ({ message }) => {
	return <div className={`px-4 py-2 rounded shadow text-white ${message.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>{message.message}</div>;
};

export default Toast;
