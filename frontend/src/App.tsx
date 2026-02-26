import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./components/layout/ProtectedRoute";
import AppShell from "./components/layout/AppShell";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import UsersPage from "./pages/UsersPage";
import TermsPage from "./pages/TermsPage";
import CoursesPage from "./pages/CoursesPage";
import CourseDetailPage from "./pages/CourseDetailPage";
import TeacherCourseDetailPage from "./pages/TeacherCourseDetailPage";
import GradeEntryPage from "./pages/GradeEntryPage";
import GradingConfigPage from "./pages/GradingConfigPage";
import MyGradesPage from "./pages/MyGradesPage";

import { useAuth } from "./contexts/AuthContext";
import { getRoleHome } from "./utils/roles";

const RoleRedirect: React.FC = () => {
  const { state, isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  const role = state?.role;
  return <Navigate to={getRoleHome(role as any)} replace />;
};

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RoleRedirect />} />

      {/* protected routes */}
      <Route element={<ProtectedRoute allowedRoles={["admin", "teacher"]} />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/courses/:id" element={<CourseDetailPage />} />
          <Route element={<ProtectedRoute allowedRoles={["teacher"]} />}>
            <Route path="/teacher/courses/:id" element={<TeacherCourseDetailPage />} />
            <Route path="/courses/:id/grades/:assignmentId" element={<GradeEntryPage />} />
          </Route>
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["admin"]} />}> 
        <Route element={<AppShell />}> 
          <Route path="/users" element={<UsersPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/config" element={<GradingConfigPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["student"]} />}> 
        <Route element={<AppShell />}> 
          <Route path="/grades" element={<MyGradesPage />} />
        </Route>
      </Route>
    </Routes>
  );
};

export default App;
