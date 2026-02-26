export type Role = 'admin' | 'teacher' | 'student';

export function getRoleHome(role: Role): string {
	switch (role) {
		case 'admin':
			return '/dashboard';
		case 'teacher':
			return '/dashboard';
		case 'student':
			return '/grades';
		default:
			return '/login';
	}
}
