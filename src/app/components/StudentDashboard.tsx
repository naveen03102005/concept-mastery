import { useMemo, useState, useEffect, useRef } from 'react';
import API_BASE_URL from '../../imports/apiConfig';
import { useNavigate } from 'react-router';
import { GraduationCap, LogOut, CheckCircle, Clock, AlertCircle, Upload, Send, TrendingUp, Bot, Settings, ClipboardList, Map as MapIcon, Target, Award } from 'lucide-react';

interface Task {
  _id: string;
  title: string;
  concept?: string;
  description: string;
  dueDate: string;
  status: string;
  priority: string;
  createdBy: { name: string };
  responseText?: string;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  feedback?: string;
  responseImage?: string;
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const userName = localStorage.getItem('userName') || 'Student';
  const userId = localStorage.getItem('userId');
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [response, setResponse] = useState('');
  const [responseImage, setResponseImage] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'performance' | 'masterymap' | 'ai' | 'settings'>('tasks');
  const [aiMessages, setAiMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const totalAssignments = tasks.length;
  const completedAssignments = useMemo(() => tasks.filter((t) => t.status === 'completed').length, [tasks]);
  const inProgressAssignments = useMemo(() => tasks.filter((t) => t.status === 'in-progress').length, [tasks]);
  const pendingAssignments = useMemo(() => tasks.filter((t) => t.status === 'pending').length, [tasks]);
  const overdueAssignments = useMemo(
    () =>
      tasks.filter((t) => {
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate);
        if (Number.isNaN(due.getTime())) return false;
        return due.getTime() < Date.now() && t.status !== 'completed';
      }).length,
    [tasks],
  );
  const completionRate = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;

  const conceptBreakdown = useMemo(() => {
    const map = new globalThis.Map<string, { concept: string; total: number; completed: number }>();
    for (const task of tasks) {
      const concept = (task.concept || '').trim() || 'General';
      const entry = map.get(concept) || { concept, total: 0, completed: 0 };
      entry.total += 1;
      if (task.status === 'completed') entry.completed += 1;
      map.set(concept, entry);
    }

    const items = Array.from(map.values()).map((i) => ({
      concept: i.concept,
      mastery: i.total > 0 ? Math.round((i.completed / i.total) * 100) : 0,
      total: i.total,
      completed: i.completed,
    }));

    items.sort((a, b) => b.total - a.total || b.mastery - a.mastery);
    return items.slice(0, 6).map((item) => {
      const color =
        item.mastery >= 80 ? 'bg-green-500' : item.mastery >= 60 ? 'bg-blue-500' : item.mastery >= 40 ? 'bg-yellow-500' : 'bg-orange-500';
      return { ...item, color };
    });
  }, [tasks]);

  const recentCompleted = useMemo(() => {
    const completed = tasks.filter((t) => t.status === 'completed');
    completed.sort((a, b) => {
      const ad = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const bd = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      return bd - ad;
    });
    return completed.slice(0, 5);
  }, [tasks]);

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    if (activeTab === 'performance') {
      fetchTasks();
    }
  }, [activeTab]);

  const fetchTasks = async () => {
    try {
      const url = userId
        ? `${API_BASE_URL}/api/tasks?assignedTo=${encodeURIComponent(userId)}`
        : `${API_BASE_URL}/api/tasks`;
      const res = await fetch(url);
      const data = await res.json();
      setTasks(data);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userType');
    localStorage.removeItem('userName');
    localStorage.removeItem('userId');
    navigate('/');
  };

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTask) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/tasks/${selectedTask._id}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ responseText: response }),
        });
        if (res.ok) {
          const updated = await res.json();
          setTasks(tasks.map(task => (task._id === selectedTask._id ? updated : task)));
        }
      } catch (err) {
        console.error('Failed to update task:', err);
      }
      setShowResponseModal(false);
      setResponse('');
      setResponseImage(null);
      setSelectedTask(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full text-sm font-medium">
            <Clock className="w-4 h-4" />
            Pending
          </div>
        );
      case 'submitted':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
            <Upload className="w-4 h-4" />
            Submitted
          </div>
        );
      case 'completed':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            Approved
          </div>
        );
      case 'in-progress':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm font-medium">
            <TrendingUp className="w-4 h-4" />
            In Progress
          </div>
        );
      case 'rejected':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm font-medium">
            <AlertCircle className="w-4 h-4" />
            Returned for Revision
          </div>
        );
    }
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const submittedTasks = tasks.filter(t => t.status === 'submitted').length;
  const completedTasksCount = tasks.filter(t => t.status === 'completed').length;

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const prompt = aiInput.trim();
    if (!prompt || aiLoading) return;

    setAiError('');
    const nextHistory = [...aiMessages, { role: 'user' as const, content: prompt }];
    setAiMessages(nextHistory);
    setAiInput('');
    setAiLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/student-assist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          history: nextHistory,
          student: {
            id: userId,
            name: userName,
            grade: localStorage.getItem('userGrade') || '',
          },
          tasks: tasks.slice(0, 10).map((t) => ({
            title: t.title,
            dueDate: t.dueDate,
            priority: t.priority,
          })),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error || `AI request failed (HTTP ${res.status})`;
        setAiError(msg);
        setAiMessages((prev) => [...prev, { role: 'assistant', content: msg }]);
        return;
      }

      setAiMessages((prev) => [...prev, { role: 'assistant', content: data.reply || 'Sorry, I could not generate a response.' }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to connect to AI server';
      setAiError(msg);
      setAiMessages((prev) => [...prev, { role: 'assistant', content: msg }]);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-emerald-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-8 h-8" />
            <div>
              <h1 className="text-xl font-bold">Student Portal</h1>
              <p className="text-sm text-emerald-100">Welcome, {userName}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors"
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
                  ? 'border-emerald-600 text-emerald-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <ClipboardList className="w-5 h-5" />
              My Tasks
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors ${
                activeTab === 'performance'
                  ? 'border-emerald-600 text-emerald-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <TrendingUp className="w-5 h-5" />
              Overall Performance
            </button>
            <button
              onClick={() => setActiveTab('masterymap')}
              className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors ${
                activeTab === 'masterymap'
                  ? 'border-emerald-600 text-emerald-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <MapIcon className="w-5 h-5" />
              Mastery Map
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors ${
                activeTab === 'ai'
                  ? 'border-emerald-600 text-emerald-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Bot className="w-5 h-5" />
              AI Assistance
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors ${
                activeTab === 'settings'
                  ? 'border-emerald-600 text-emerald-600 font-medium'
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
                    <p className="text-gray-600 text-sm">Pending Tasks</p>
                    <p className="text-3xl font-bold text-gray-900">{pendingTasks}</p>
                  </div>
                  <AlertCircle className="w-12 h-12 text-yellow-600" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Submitted</p>
                    <p className="text-3xl font-bold text-gray-900">{submittedTasks}</p>
                  </div>
                  <Upload className="w-12 h-12 text-blue-600" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Approved</p>
                    <p className="text-3xl font-bold text-gray-900">{completedTasksCount}</p>
                  </div>
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-6">My Tasks</h2>

            <div className="grid gap-6">
              {loading ? (
                <p className="text-gray-500">Loading tasks...</p>
              ) : tasks.length === 0 ? (
                <p className="text-gray-500">No tasks assigned yet.</p>
              ) : (
                tasks.map((task) => (
                  <div key={task._id} className="bg-white rounded-xl shadow p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{task.title}</h3>
                        {task.concept && (
                          <p className="text-sm text-emerald-700 font-medium mb-2">{task.concept}</p>
                        )}
                        <p className="text-gray-600 mb-4">{task.description}</p>

                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}</span>
                        </div>
                        {task.createdBy && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                            <span>Created by: {task.createdBy.name}</span>
                          </div>
                        )}
                      </div>
                      {getStatusBadge(task.status) || (
                        <div className="px-3 py-1 rounded-full text-sm font-medium text-gray-600 bg-gray-50">
                          {task.status}
                        </div>
                      )}
                    </div>

                    {task.status === 'pending' && (
                      <button
                        onClick={() => {
                          setSelectedTask(task);
                          setShowResponseModal(true);
                        }}
                        className="w-full md:w-auto px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        Submit Response
                      </button>
                    )}

                    {task.status === 'submitted' && (
                      <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
                        Submitted{task.submittedAt ? ` on ${new Date(task.submittedAt).toLocaleString()}` : ''}. Waiting for staff approval.
                        {task.responseText && (
                          <div className="mt-3 p-3 bg-white/70 rounded border border-blue-200">
                            <p className="text-xs font-semibold mb-1">Your Response</p>
                            <pre className="whitespace-pre-wrap text-xs text-blue-900">{task.responseText}</pre>
                          </div>
                        )}
                      </div>
                    )}

                    {task.status === 'completed' && (
                      <div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
                        Approved{task.approvedAt ? ` on ${new Date(task.approvedAt).toLocaleString()}` : ''}.
                        {task.responseText && (
                          <div className="mt-3 p-3 bg-white/70 rounded border border-green-200">
                            <p className="text-xs font-semibold mb-1">Your Response</p>
                            <pre className="whitespace-pre-wrap text-xs text-green-900">{task.responseText}</pre>
                          </div>
                        )}
                      </div>
                    )}

                    {task.status === 'in-progress' && task.feedback && (
                      <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="w-4 h-4" />
                          <span className="font-semibold">Returned for Revision</span>
                          {task.rejectedAt && <span className="text-xs">- {new Date(task.rejectedAt).toLocaleString()}</span>}
                        </div>
                        <div className="mb-3 p-3 bg-white/70 rounded border border-red-200">
                          <p className="text-xs font-semibold mb-1">Staff Feedback:</p>
                          <pre className="whitespace-pre-wrap text-xs text-red-900">{task.feedback}</pre>
                        </div>
                        {task.responseText && (
                          <div className="p-3 bg-white/70 rounded border border-red-200">
                            <p className="text-xs font-semibold mb-1">Your Previous Response:</p>
                            <pre className="whitespace-pre-wrap text-xs text-red-900">{task.responseText}</pre>
                          </div>
                        )}
                        <button
                          onClick={() => {
                            setSelectedTask(task);
                            setResponse(task.responseText || '');
                            setShowResponseModal(true);
                          }}
                          className="mt-3 w-full md:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <Send className="w-4 h-4" />
                          Resubmit Response
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Overall Performance</h2>

            <div className="grid md:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow p-6">
                <p className="text-gray-600 text-sm mb-2">Total Assignments</p>
                <p className="text-4xl font-bold text-gray-900">{totalAssignments}</p>
              </div>
              <div className="bg-white rounded-xl shadow p-6">
                <p className="text-gray-600 text-sm mb-2">Completed</p>
                <p className="text-4xl font-bold text-green-600">{completedAssignments}</p>
              </div>
              <div className="bg-white rounded-xl shadow p-6">
                <p className="text-gray-600 text-sm mb-2">Completion Rate</p>
                <p className="text-4xl font-bold text-blue-600">{completionRate}%</p>
              </div>
              <div className="bg-white rounded-xl shadow p-6">
                <p className="text-gray-600 text-sm mb-2">Overdue</p>
                <p className="text-4xl font-bold text-red-600">{overdueAssignments}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Concept Progress (from tasks)</h3>
              <p className="text-sm text-gray-600 mb-4">
                Based on tasks you’ve completed per concept.
              </p>

              {conceptBreakdown.length === 0 ? (
                <p className="text-gray-500">No tasks available yet.</p>
              ) : (
                <div className="space-y-4">
                  {conceptBreakdown.map((item) => (
                    <div key={item.concept}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">{item.concept}</span>
                        <span className="text-sm font-bold text-gray-900">
                          {item.mastery}% ({item.completed}/{item.total})
                        </span>
                      </div>
                      <div className="bg-gray-200 rounded-full h-2">
                        <div className={`${item.color} h-2 rounded-full transition-all`} style={{ width: `${item.mastery}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Task Summary</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingAssignments}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold text-blue-700">{inProgressAssignments}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-green-700">{completedAssignments}</p>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="font-bold text-gray-900 mb-3">Recently Completed</h4>
                {recentCompleted.length === 0 ? (
                  <p className="text-gray-500">No completed tasks yet.</p>
                ) : (
                  <div className="space-y-3">
                    {recentCompleted.map((task) => (
                      <div key={task._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{task.title}</p>
                          <p className="text-sm text-gray-600">{(task.concept || '').trim() || 'General'}</p>
                        </div>
                        <div className="text-sm font-medium text-gray-700">
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'masterymap' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Learning Journey - Mastery Map</h2>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow p-6 border-2 border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <Award className="w-8 h-8 text-green-600" />
                  <span className="text-2xl font-bold text-green-600">5</span>
                </div>
                <p className="text-gray-900 font-medium">Mastered Concepts</p>
                <p className="text-sm text-gray-600">90%+ proficiency</p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow p-6 border-2 border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <Target className="w-8 h-8 text-blue-600" />
                  <span className="text-2xl font-bold text-blue-600">3</span>
                </div>
                <p className="text-gray-900 font-medium">In Progress</p>
                <p className="text-sm text-gray-600">60-89% proficiency</p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl shadow p-6 border-2 border-orange-200">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="w-8 h-8 text-orange-600" />
                  <span className="text-2xl font-bold text-orange-600">2</span>
                </div>
                <p className="text-gray-900 font-medium">Needs Practice</p>
                <p className="text-sm text-gray-600">Below 60%</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Learning Path Visualization</h3>

              <div className="space-y-8">
                <div className="relative">
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                      <div className="w-1 h-24 bg-green-500"></div>
                    </div>
                    <div className="flex-1 pt-2">
                      <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-gray-900">Algebra - Linear Equations</h4>
                          <span className="px-3 py-1 bg-green-500 text-white rounded-full text-sm font-medium">
                            95% Mastered
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">Completed all assessments with excellent scores</p>
                        <div className="flex gap-2">
                          <span className="text-xs px-2 py-1 bg-white rounded border border-green-300">Solving</span>
                          <span className="text-xs px-2 py-1 bg-white rounded border border-green-300">Graphing</span>
                          <span className="text-xs px-2 py-1 bg-white rounded border border-green-300">Applications</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                      <div className="w-1 h-24 bg-blue-500"></div>
                    </div>
                    <div className="flex-1 pt-2">
                      <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-gray-900">Algebra - Quadratic Functions</h4>
                          <span className="px-3 py-1 bg-green-500 text-white rounded-full text-sm font-medium">
                            92% Mastered
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">Strong understanding of core concepts</p>
                        <div className="flex gap-2">
                          <span className="text-xs px-2 py-1 bg-white rounded border border-green-300">Factoring</span>
                          <span className="text-xs px-2 py-1 bg-white rounded border border-green-300">Vertex Form</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                        <Target className="w-6 h-6" />
                      </div>
                      <div className="w-1 h-24 bg-blue-500"></div>
                    </div>
                    <div className="flex-1 pt-2">
                      <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-gray-900">Biology - Cell Division (Mitosis)</h4>
                          <span className="px-3 py-1 bg-blue-500 text-white rounded-full text-sm font-medium">
                            78% In Progress
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">Good foundation, working on advanced phases</p>
                        <div className="bg-white rounded p-2 mt-2">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span>Progress to mastery</span>
                            <span className="font-medium">12% to go</span>
                          </div>
                          <div className="bg-gray-200 rounded-full h-2">
                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: '78%' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                        <Target className="w-6 h-6" />
                      </div>
                      <div className="w-1 h-24 bg-orange-500"></div>
                    </div>
                    <div className="flex-1 pt-2">
                      <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-gray-900">Literature - Shakespeare Analysis</h4>
                          <span className="px-3 py-1 bg-blue-500 text-white rounded-full text-sm font-medium">
                            85% In Progress
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">Developing strong analytical skills</p>
                        <div className="bg-white rounded p-2 mt-2">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span>Progress to mastery</span>
                            <span className="font-medium">5% to go</span>
                          </div>
                          <div className="bg-gray-200 rounded-full h-2">
                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <div className="w-1 h-24 bg-orange-500"></div>
                    </div>
                    <div className="flex-1 pt-2">
                      <div className="bg-orange-50 rounded-lg p-4 border-l-4 border-orange-500">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-gray-900">Chemistry - Atomic Structure</h4>
                          <span className="px-3 py-1 bg-orange-500 text-white rounded-full text-sm font-medium">
                            58% Needs Practice
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">Review recommended before next assessment</p>
                        <div className="bg-white rounded p-3 mt-2 border border-orange-300">
                          <p className="text-xs font-medium text-orange-800 mb-2">Recommended Actions:</p>
                          <ul className="text-xs text-gray-700 space-y-1">
                            <li>• Review electron configuration rules</li>
                            <li>• Practice periodic table trends</li>
                            <li>• Use AI assistant for concept clarification</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                    </div>
                    <div className="flex-1 pt-2">
                      <div className="bg-orange-50 rounded-lg p-4 border-l-4 border-orange-500">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-gray-900">Physics - Motion & Forces</h4>
                          <span className="px-3 py-1 bg-orange-500 text-white rounded-full text-sm font-medium">
                            52% Needs Practice
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">Foundation building in progress</p>
                        <div className="bg-white rounded p-3 mt-2 border border-orange-300">
                          <p className="text-xs font-medium text-orange-800 mb-2">Recommended Actions:</p>
                          <ul className="text-xs text-gray-700 space-y-1">
                            <li>• Complete practice problems on velocity</li>
                            <li>• Watch supplemental video tutorials</li>
                            <li>• Schedule study group session</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center gap-4">
                <Award className="w-12 h-12" />
                <div>
                  <h3 className="text-xl font-bold mb-1">Keep Up the Great Work!</h3>
                  <p className="text-emerald-50">You're making excellent progress on your learning journey. Focus on chemistry and physics to bring them up to mastery level.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">AI Learning Assistant</h2>

            <div className="bg-white rounded-xl shadow p-6 h-[600px] flex flex-col">
              {aiError && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {aiError}
                </div>
              )}
              <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                {aiMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <Bot className="w-16 h-16 text-emerald-600 mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">AI Learning Assistant</h3>
                    <p className="text-gray-600 max-w-md">
                      Ask me anything about your assignments, request concept explanations, or get study tips. I'm here to help you master your subjects!
                    </p>
                  </div>
                ) : (
                  aiMessages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] p-4 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}

                {aiLoading && (
                  <div className="flex justify-start">
                    <div className="max-w-[70%] p-4 rounded-lg bg-gray-100 text-gray-900">
                      Thinking…
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleAiSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Ask a question about your studies..."
                  disabled={aiLoading}
                />
                <button
                  type="submit"
                  disabled={aiLoading}
                  className={`px-6 py-3 text-white rounded-lg transition-colors ${
                    aiLoading ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    defaultValue={`${userName}@school.edu`}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Student ID</label>
                  <input
                    type="text"
                    defaultValue="STU-2024-0123"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Notification Preferences</h3>
              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium text-gray-900">Email Notifications</p>
                    <p className="text-sm text-gray-600">Receive updates about new assignments</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5 text-emerald-600" />
                </label>
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium text-gray-900">Grade Notifications</p>
                    <p className="text-sm text-gray-600">Get notified when assignments are graded</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5 text-emerald-600" />
                </label>
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium text-gray-900">Deadline Reminders</p>
                    <p className="text-sm text-gray-600">Reminders 24 hours before due dates</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5 text-emerald-600" />
                </label>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Display Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
                    <option>Light</option>
                    <option>Dark</option>
                    <option>Auto</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
                    <option>English</option>
                    <option>Spanish</option>
                    <option>French</option>
                  </select>
                </div>
              </div>
            </div>

            <button className="w-full px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium">
              Save Changes
            </button>
          </div>
        )}
      </div>

      {showResponseModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Submit Response</h2>
            <h3 className="text-lg text-gray-700 mb-6">{selectedTask.title}</h3>

            <form onSubmit={handleSubmitResponse} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Response
                </label>
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  rows={8}
                  placeholder="Type your answer or solution here..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attach Image (Optional)
                </label>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-emerald-500 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ minHeight: 120 }}
                >
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Click to upload or drag and drop</p>
                  <p className="text-sm text-gray-500 mt-1">Images up to 10MB</p>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        setResponseImage(e.target.files[0]);
                      }
                    }}
                  />
                  {responseImage && (
                    <div className="mt-2 text-sm text-green-600">Selected: {responseImage.name}</div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowResponseModal(false);
                    setResponse('');
                    setSelectedTask(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Submit Response
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
