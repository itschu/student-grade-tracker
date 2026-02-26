import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Term {
	id: string;
	name: string;
}

interface TermContextValue {
	activeTerm: Term | null;
	setActiveTerm: (term: Term | null) => void;
}

const TermContext = createContext<TermContextValue | undefined>(undefined);

export const TermProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const [activeTerm, setActiveTermState] = useState<Term | null>(() => {
		const stored = sessionStorage.getItem('activeTerm');
		if (stored) {
			try {
				return JSON.parse(stored) as Term;
			} catch {
				return null;
			}
		}
		return null;
	});

	const setActiveTerm = (term: Term | null) => {
		if (term) {
			sessionStorage.setItem('activeTerm', JSON.stringify(term));
		} else {
			sessionStorage.removeItem('activeTerm');
		}
		setActiveTermState(term);
	};

	return <TermContext.Provider value={{ activeTerm, setActiveTerm }}>{children}</TermContext.Provider>;
};

export const useTerm = (): TermContextValue => {
	const ctx = useContext(TermContext);
	if (!ctx) {
		throw new Error('useTerm must be used within a TermProvider');
	}
	return ctx;
};
