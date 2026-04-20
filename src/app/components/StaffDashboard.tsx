import { useMemo, useState, useEffect } from 'react';
import API_BASE_URL from '../../imports/apiConfig';
import { useNavigate } from 'react-router';
import { BookOpen, Plus, LogOut, Users, ClipboardList, CheckCircle, Clock, AlertCircle, Settings, FileText, CheckSquare, XCircle } from 'lucide-react';

interface Task {
  _id: string;
  title: string;
  concept?: string;
  description: string;
  dueDate: string;
  status: string;
  priority: string;
  createdBy: { name: string };
  assignedTo: { name: string; grade: string } | null;
  responseText?: string;
  submittedAt?: string;
  approvedAt?: string;
}

interface Student {
  _id: string;
  name: string;
  email: string;
  grade: string;
  createdAt?: string;
}

export default function StaffDashboard() {
  const navigate = useNavigate();
  const userName = localStorage.getItem('userName') || 'Teacher';
  const userId = localStorage.getItem('userId');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectFeedback, setRejectFeedback] = useState('');
  const [reviewTask, setReviewTask] = useState<Task | null>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'students' | 'approvals' | 'settings'>('tasks');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
    fetchStudents();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/tasks?createdBy=${userId}`);
      const data = await res.json();
      setTasks(data);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/students`);
      const data = await res.json();
      setStudents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch students:', err);
      setStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  };

  const [newTask, setNewTask] = useState({
    title: '',
    concept: '',
    description: '',
    dueDate: '',
    priority: 'medium',
    assignedStudentIds: [] as string[],
  });

  const handleLogout = () => {
    localStorage.removeItem('userType');
    localStorage.removeItem('userName');
    localStorage.removeItem('userId');
    navigate('/');
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const createOne = async (assignedTo?: string) => {
        const res = await fetch(`${API_BASE_URL}/api/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: newTask.title,
            concept: newTask.concept,
            description: newTask.description,
            dueDate: newTask.dueDate,
            priority: newTask.priority,
            createdBy: userId,
            status: 'pending',
            ...(assignedTo ? { assignedTo } : {}),
          }),
        });
        if (!res.ok) throw new Error('Failed to create task');
        return res.json();
      };

      const createdTasks = newTask.assignedStudentIds.length
        ? await Promise.all(newTask.assignedStudentIds.map((id) => createOne(id)))
        : [await createOne()];

      setTasks((prev) => [...createdTasks, ...prev]);
      setShowCreateModal(false);
      setNewTask({ title: '', concept: '', description: '', dueDate: '', priority: 'medium', assignedStudentIds: [] });
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, { method: 'DELETE' });
      setTasks(tasks.filter(t => t._id !== taskId));
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleApproveTask = async (taskId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy: userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('Approve failed:', data?.error || res.statusText);
        return;
      }
      setTasks((prev) => prev.map((t) => (t._id === taskId ? data : t)));
      setShowReviewModal(false);
      setShowRejectModal(false);
      setReviewTask(null);
      setRejectFeedback('');
    } catch (err) {
      console.error('Failed to approve task:', err);
    }
  };

  const handleRejectTask = async (taskId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectedBy: userId, feedback: rejectFeedback }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('Reject failed:', data?.error || res.statusText);
        return;
      }
      setTasks((prev) => prev.map((t) => (t._id === taskId ? data : t)));
      setShowReviewModal(false);
      setShowRejectModal(false);
      setReviewTask(null);
      setRejectFeedback('');
    } catch (err) {
      console.error('Failed to reject task:', err);
    }
  };

  const totalStudents = students.length;
  const pendingTasks = useMemo(() => tasks.filter((t) => t.status === 'pending').length, [tasks]);
  const inProgressTasks = useMemo(() => tasks.filter((t) => t.status === 'in-progress').length, [tasks]);
  const completedTasks = useMemo(() => tasks.filter((t) => t.status === 'completed').length, [tasks]);
  const submittedTasks = useMemo(() => tasks.filter((t) => t.status === 'submitted').length, [tasks]);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-indigo-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8" />
            <div>
              <h1 className="text-xl font-bold">Staff Portal</h1>
              <p className="text-sm text-indigo-100">Welcome, {userName}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-700 rounded-lg hover:bg-indigo-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </nav>

      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors ${
                activeTab === 'tasks'
                  ? 'border-indigo-600 text-indigo-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <ClipboardList className="w-5 h-5" />
              Task Management
            </button>
            <button
              onClick={() => {
                setActiveTab('students');
                fetchStudents();
              }}
              className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors ${
                activeTab === 'students'
                  ? 'border-indigo-600 text-indigo-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-5 h-5" />
              Students
            </button>
            <button
              onClick={() => setActiveTab('approvals')}
              className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors ${
                activeTab === 'approvals'
                  ? 'border-indigo-600 text-indigo-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <CheckSquare className="w-5 h-5" />
              Task Approval
              {submittedTasks > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {submittedTasks}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors ${
                activeTab === 'settings'
                  ? 'border-indigo-600 text-indigo-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Settings className="w-5 h-5" />
              Settings
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'tasks' && (
          <>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Total Students</p>
                    <p className="text-3xl font-bold text-gray-900">{studentsLoading ? '…' : totalStudents}</p>
                  </div>
                  <Users className="w-12 h-12 text-indigo-600" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Active Tasks</p>
                    <p className="text-3xl font-bold text-gray-900">{pendingTasks + inProgressTasks}</p>
                  </div>
                  <ClipboardList className="w-12 h-12 text-emerald-600" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Submissions</p>
                    <p className="text-3xl font-bold text-gray-900">{submittedTasks}</p>
                  </div>
                  <FileText className="w-12 h-12 text-indigo-600" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Assigned Tasks</h2>
              <button
                onClick={() => {
                  setShowCreateModal(true);
                  fetchStudents();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create New Task
              </button>
            </div>

            <div className="grid gap-6">
              {loading ? (
                <p className="text-gray-500">Loading tasks...</p>
              ) : tasks.length === 0 ? (
                <p className="text-gray-500">No tasks yet. Create your first task!</p>
              ) : (
                tasks.map((task) => (
                  <div key={task._id} className="bg-white rounded-xl shadow p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{task.title}</h3>
                        {task.concept && (
                          <p className="text-sm text-indigo-700 font-medium mb-2">{task.concept}</p>
                        )}
                        <p className="text-gray-600">{task.description}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        task.status === 'completed' ? 'text-green-600 bg-green-50' :
                        task.status === 'in-progress' ? 'text-yellow-600 bg-yellow-50' :
                        task.status === 'submitted' ? 'text-blue-600 bg-blue-50' :
                        'text-gray-600 bg-gray-50'
                      }`}>
                        {task.status}
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        <span>Priority: {task.priority}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>
                          {task.assignedTo ? `${task.assignedTo.name} (${task.assignedTo.grade})` : 'All Students'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      {task.status === 'submitted' && (
                        <>
                          <button
                            onClick={() => {
                              setReviewTask(task);
                              setShowReviewModal(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-800 text-sm"
                          >
                            Review Response
                          </button>
                          <button
                            onClick={() => handleApproveTask(task._id)}
                            className="text-green-600 hover:text-green-800 text-sm"
                          >
                            Approve
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDeleteTask(task._id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {activeTab === 'students' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Registered Students</h2>
              <button
                onClick={fetchStudents}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Refresh
              </button>
            </div>

            <div className="bg-white rounded-xl shadow overflow-hidden">
              {studentsLoading ? (
                <div className="p-6 text-gray-500">Loading students…</div>
              ) : students.length === 0 ? (
                <div className="p-6 text-gray-500">No students registered yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left text-xs font-semibold text-gray-600 px-6 py-4">Name</th>
                        <th className="text-left text-xs font-semibold text-gray-600 px-6 py-4">Email</th>
                        <th className="text-left text-xs font-semibold text-gray-600 px-6 py-4">Student ID / Grade</th>
                        <th className="text-left text-xs font-semibold text-gray-600 px-6 py-4">Registered</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {students.map((s) => (
                        <tr key={s._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium text-gray-900">{s.name}</td>
                          <td className="px-6 py-4 text-gray-700">{s.email}</td>
                          <td className="px-6 py-4 text-gray-700">{s.grade}</td>
                          <td className="px-6 py-4 text-gray-700">
                            {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Settings</h2>

            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Account Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    defaultValue={userName}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    defaultValue={`${userName}@school.edu`}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Staff ID</label>
                  <input
                    type="text"
                    defaultValue="STAFF-2024-789"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                    <option>Mathematics</option>
                    <option>Science</option>
                    <option>English</option>
                    <option>History</option>
                    <option>Languages</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Class Management</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Default Assignment Duration</label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                    <option>1 week</option>
                    <option>2 weeks</option>
                    <option>1 month</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Grading Scale</label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                    <option>Letter Grades (A-F)</option>
                    <option>Percentage (0-100)</option>
                    <option>Points Based</option>
                  </select>
                </div>
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium text-gray-900">Auto-assign to all students</p>
                    <p className="text-sm text-gray-600">New tasks automatically assigned to all enrolled students</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5 text-indigo-600" />
                </label>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Notification Preferences</h3>
              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium text-gray-900">Email Notifications</p>
                    <p className="text-sm text-gray-600">Receive updates when students submit assignments</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5 text-indigo-600" />
                </label>
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium text-gray-900">Late Submission Alerts</p>
                    <p className="text-sm text-gray-600">Get notified when students miss deadlines</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5 text-indigo-600" />
                </label>
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium text-gray-900">Daily Summary</p>
                    <p className="text-sm text-gray-600">Receive daily reports of class activity</p>
                  </div>
                  <input type="checkbox" className="w-5 h-5 text-indigo-600" />
                </label>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Display Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                    <option>Light</option>
                    <option>Dark</option>
                    <option>Auto</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                    <option>English</option>
                    <option>Spanish</option>
                    <option>French</option>
                  </select>
                </div>
              </div>
            </div>

            <button className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">
              Save Changes
            </button>
          </div>
        )}

        {activeTab === 'approvals' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Task Approvals</h2>
              <button
                onClick={fetchTasks}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Refresh
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Pending Approval</p>
                    <p className="text-3xl font-bold text-gray-900">{submittedTasks}</p>
                  </div>
                  <Clock className="w-12 h-12 text-yellow-600" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Approved Today</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {tasks.filter(t => t.status === 'completed' && t.approvedAt && new Date(t.approvedAt).toDateString() === new Date().toDateString()).length}
                    </p>
                  </div>
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Returned for Revision</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {tasks.filter(t => t.status === 'in-progress' && t.feedback).length}
                    </p>
                  </div>
                  <XCircle className="w-12 h-12 text-red-600" />
                </div>
              </div>
            </div>

            {loading ? (
              <p className="text-gray-500">Loading submissions...</p>
            ) : tasks.filter(t => t.status === 'submitted').length === 0 ? (
              <div className="bg-white rounded-xl shadow p-12 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">All Caught Up!</h3>
                <p className="text-gray-600">No pending submissions to review.</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {tasks.filter(t => t.status === 'submitted').map((task) => (
                  <div key={task._id} className="bg-white rounded-xl shadow p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{task.title}</h3>
                        {task.concept && (
                          <p className="text-sm text-indigo-700 font-medium mb-2">{task.concept}</p>
                        )}
                        <p className="text-gray-600">{task.description}</p>
                      </div>
                      <div className="px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-600">
                        Submitted
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">
                          {task.assignedTo ? `${task.assignedTo.name} (${task.assignedTo.grade})` : 'All Students'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          Submitted: {task.submittedAt ? new Date(task.submittedAt).toLocaleString() : '—'}
                        </span>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Student Response:</p>
                      <div className="p-4 bg-white border border-gray-200 rounded-lg mb-4">
                        <pre className="whitespace-pre-wrap text-gray-900 text-sm">{task.responseText || 'No response provided'}</pre>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setReviewTask(task);
                          setShowReviewModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                        Review & Approve
                      </button>
                      <button
                        onClick={() => {
                          setReviewTask(task);
                          setShowRejectModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        Return for Revision
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Task</h2>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Title
                </label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., Algebra Quiz on Linear Functions"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Concept Area
                </label>
                <input
                  type="text"
                  value={newTask.concept}
                  onChange={(e) => setNewTask({ ...newTask, concept: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., Mathematics - Linear Algebra"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={3}
                  placeholder="Detailed instructions for students..."
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign To (optional)
                  </label>
                  <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto">
                    {studentsLoading ? (
                      <p className="text-sm text-gray-500">Loading students…</p>
                    ) : students.length === 0 ? (
                      <p className="text-sm text-gray-500">No students registered yet. Task will be for all students.</p>
                    ) : (
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={newTask.assignedStudentIds.length === 0}
                            onChange={() => setNewTask({ ...newTask, assignedStudentIds: [] })}
                            className="w-4 h-4"
                          />
                          All Students
                        </label>
                        <div className="border-t pt-2 space-y-2">
                          {students.map((s) => (
                            <label key={s._id} className="flex items-center gap-2 text-sm text-gray-700">
                              <input
                                type="checkbox"
                                checked={newTask.assignedStudentIds.includes(s._id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewTask({
                                      ...newTask,
                                      assignedStudentIds: Array.from(new Set([...newTask.assignedStudentIds, s._id])),
                                    });
                                  } else {
                                    setNewTask({
                                      ...newTask,
                                      assignedStudentIds: newTask.assignedStudentIds.filter((id) => id !== s._id),
                                    });
                                  }
                                }}
                                className="w-4 h-4"
                              />
                              <span className="flex-1">{s.name}</span>
                              <span className="text-xs text-gray-500">{s.grade}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Selecting multiple students creates one task per student. Leaving all unchecked assigns to all students.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReviewModal && reviewTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Submission</h2>
            <h3 className="text-lg text-gray-700 mb-6">{reviewTask.title}</h3>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-1">Student</p>
                <p className="text-gray-900">
                  {reviewTask.assignedTo ? `${reviewTask.assignedTo.name} (${reviewTask.assignedTo.grade})` : 'All Students'}
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-1">Submitted At</p>
                <p className="text-gray-900">
                  {reviewTask.submittedAt ? new Date(reviewTask.submittedAt).toLocaleString() : '—'}
                </p>
              </div>

              <div className="p-4 bg-white border border-gray-200 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Student Response</p>
                <pre className="whitespace-pre-wrap text-gray-900 text-sm">{reviewTask.responseText || '—'}</pre>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowReviewModal(false);
                  setReviewTask(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleApproveTask(reviewTask._id)}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Approve Task
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && reviewTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Return for Revision</h2>
            <h3 className="text-lg text-gray-700 mb-6">{reviewTask.title}</h3>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-1">Student</p>
                <p className="text-gray-900">
                  {reviewTask.assignedTo ? `${reviewTask.assignedTo.name} (${reviewTask.assignedTo.grade})` : 'All Students'}
                </p>
              </div>

              <div className="p-4 bg-white border border-gray-200 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Student Response</p>
                <pre className="whitespace-pre-wrap text-gray-900 text-sm">{reviewTask.responseText || '—'}</pre>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Feedback for Student (required)
                </label>
                <textarea
                  value={rejectFeedback}
                  onChange={(e) => setRejectFeedback(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={4}
                  placeholder="Explain what needs to be revised or improved..."
                  required
                />
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectFeedback('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!rejectFeedback.trim()) {
                    alert('Please provide feedback for the student');
                    return;
                  }
                  handleRejectTask(reviewTask._id);
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Return for Revision
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
