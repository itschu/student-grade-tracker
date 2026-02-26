import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { getRoleHome } from '../utils/roles';

const LoginPage: React.FC = () => {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState(false);
	const { login } = useAuth();
	const navigate = useNavigate();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(false);
		try {
			const resp = await client.post('/api/v1/auth/login', { email, password });
			const { access_token, role, user_id } = resp.data;
			login(access_token, role, user_id);
			navigate(getRoleHome(role));
		} catch (_err) {
			setError(true);
		}
	};

	return (
		<div className="min-h-screen bg-[#f4f5f7] flex items-center justify-center">
			<div className="bg-white border border-gray-200 rounded-lg p-10 w-[360px] shadow-sm">
				<h1 className="text-2xl font-bold mb-2">Student Grade Tracker</h1>
				<p className="mb-6 text-gray-600">Sign in to your account</p>
				<form onSubmit={handleSubmit}>
					<div className="mb-4">
						<label className="block text-sm mb-1">Email</label>
						<input type="email" className="w-full border px-3 py-2 rounded" value={email} onChange={(e) => setEmail(e.target.value)} required />
					</div>
					<div className="mb-4">
						<label className="block text-sm mb-1">Password</label>
						<input type="password" className="w-full border px-3 py-2 rounded" value={password} onChange={(e) => setPassword(e.target.value)} required />
					</div>
					{error && <p className="text-red-500 mb-4">Invalid email or password.</p>}
					<button type="submit" className="w-full bg-[#2c3e50] text-white py-2 rounded">
						Sign In
					</button>
				</form>
			</div>
		</div>
	);
};

export default LoginPage;
