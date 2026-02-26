import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface AuthState {
	token: string;
	role: 'admin' | 'teacher' | 'student';
	user_id: string;
}

interface AuthContextValue {
	state: AuthState | null;
	login: (token: string, role: AuthState['role'], user_id: string) => void;
	logout: () => void;
	isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// shared logout logic usable outside React
export function performLogout() {
	localStorage.removeItem('auth');
	// redirect to login page
	window.location.href = '/login';
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const [state, setState] = useState<AuthState | null>(() => {
		const stored = localStorage.getItem('auth');
		if (stored) {
			try {
				return JSON.parse(stored) as AuthState;
			} catch {
				return null;
			}
		}
		return null;
	});

	const login = (token: string, role: AuthState['role'], user_id: string) => {
		const auth: AuthState = { token, role, user_id };
		localStorage.setItem('auth', JSON.stringify(auth));
		setState(auth);
	};

	const logout = () => {
		setState(null);
		performLogout();
	};

	const isAuthenticated = state !== null && !!state.token;

	return <AuthContext.Provider value={{ state, login, logout, isAuthenticated }}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
	const ctx = useContext(AuthContext);
	if (!ctx) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return ctx;
};
