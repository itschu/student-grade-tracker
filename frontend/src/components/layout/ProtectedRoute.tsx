import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getRoleHome, Role } from '../../utils/roles';

interface ProtectedRouteProps {
	allowedRoles: Role[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
	const { state, isAuthenticated } = useAuth();
	const role = state?.role;

	if (!isAuthenticated) {
		return <Navigate to="/login" replace />;
	}

	if (role && !allowedRoles.includes(role as Role)) {
		return <Navigate to={getRoleHome(role as Role)} replace />;
	}

	return <Outlet />;
};

export default ProtectedRoute;
