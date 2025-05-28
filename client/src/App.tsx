// client/src/App.tsx
import { Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Schools from "@/pages/schools";
import Users from "@/pages/users";
import UserRoles from "@/pages/user-roles";
import SchedulePage from "@/pages/schedule";
import ClassSchedulePage from "@/pages/schedule-class";
import OverallSchedulePage from "@/pages/schedule-overall";
import StudentSchedulePage from "@/pages/student-schedule";
import ClassGradeDetailsPage from "@/pages/class-grade-details";
import ClassTimeSlotsPage from "@/pages/class-time-slots";
import Grades from "@/pages/grades";
import GradingSystems from "@/pages/grading-systems";
import Homework from "@/pages/homework";
import Messages from "@/pages/messages";
import Documents from "@/pages/documents";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";
import Support from "./pages/support-page";
import Notifications from "./pages/notifications";
import SystemLogs from "./pages/system-logs";
import StudentClassAssignments from "./pages/student-class-assignments";
import ParentStudentConnections from "./pages/parent-student-connections";
import ClassTeacherDashboard from "./pages/class-teacher-dashboard";
import ClassTeacherGradesPage from "./pages/class-teacher-grades";
import TeacherClasses from "./pages/teacher-classes";
import Subgroups from "./pages/subgroups";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";
// Импортируем новую страницу
import SubjectsManagementPage from "./pages/subjects-management";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/schools" component={Schools} />
      <ProtectedRoute path="/users" component={Users} />
      <ProtectedRoute path="/user-roles" component={UserRoles} />
      {/* Добавляем новый маршрут */}
      <ProtectedRoute path="/subjects-management" component={SubjectsManagementPage} />
      <ProtectedRoute path="/schedule" component={SchedulePage} />
      <ProtectedRoute path="/schedule-class/:classId" component={ClassSchedulePage} />
      <ProtectedRoute path="/schedule-class/:classId/time-slots" component={ClassTimeSlotsPage} />
      <ProtectedRoute path="/schedule-overall" component={OverallSchedulePage} />
      <ProtectedRoute path="/student-schedule/:studentId" component={StudentSchedulePage} />
      <ProtectedRoute path="/class-grade-details/:classId/:subjectId/:subgroupId?" component={ClassGradeDetailsPage} />
      <ProtectedRoute path="/grades" component={Grades} />
      <ProtectedRoute path="/grading-systems" component={GradingSystems} />
      <ProtectedRoute path="/homework" component={Homework} />
      <ProtectedRoute path="/messages" component={Messages} />
      <ProtectedRoute path="/documents" component={Documents} />
      <ProtectedRoute path="/analytics" component={Analytics} />
      <ProtectedRoute path="/settings" component={Settings} />
      <ProtectedRoute path="/support" component={Support} />
      <ProtectedRoute path="/notifications" component={Notifications} />
      <ProtectedRoute path="/system-logs" component={SystemLogs} />
      <ProtectedRoute path="/student-class-assignments" component={StudentClassAssignments} />
      <ProtectedRoute path="/parent-student-connections" component={ParentStudentConnections} />
      <ProtectedRoute path="/class-teacher-dashboard" component={ClassTeacherDashboard} />
      <ProtectedRoute path="/class-teacher-grades" component={ClassTeacherGradesPage} />
      <ProtectedRoute path="/teacher-classes" component={TeacherClasses} />
      <ProtectedRoute path="/subgroups" component={Subgroups} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;