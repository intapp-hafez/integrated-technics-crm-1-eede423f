import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStoreState, actions, AdminTask, AdminTaskStatus, AdminTaskActivity } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { useState, useMemo } from "react";
import { Plus, X, ListTodo, MessageSquare, Clock4, CheckCircle2, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { shortId } from "@/lib/utils";

type DateFilter = "today" | "week" | "month" | "all";
const DATE_FILTERS: { key: DateFilter; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "all", label: "All Time" },
];
function inRange(dateStr: string, filter: DateFilter): boolean {
  if (filter === "all") return true;
  const d = new Date(dateStr);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (filter === "today") return d >= todayStart;
  if (filter === "week") {
    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - todayStart.getDay());
    return d >= weekStart;
  }
  if (filter === "month") return d >= new Date(now.getFullYear(), now.getMonth(), 1);
  return true;
}

export const Route = createFileRoute("/admin/todo")({
  component: AdminTodoPage,
  head: () => ({ meta: [{ title: "To-Do List · INT-CRM" }] }),
});

const STATUSES: AdminTaskStatus[] = ["new", "in progress", "done", "delayed"];

const STATUS_COLORS: Record<AdminTaskStatus, string> = {
  "new": "bg-sky-100 text-sky-700 border-sky-200",
  "in progress": "bg-amber-100 text-amber-700 border-amber-200",
  "done": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "delayed": "bg-rose-100 text-rose-700 border-rose-200",
};

function AdminTodoPage() {
  const { adminTasks } = useStoreState();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<AdminTask | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  const filteredTasks = useMemo(
    () => adminTasks.filter((t) => inRange(t.date, dateFilter)),
    [adminTasks, dateFilter]
  );

  // Group tasks by status
  const groupedTasks = STATUSES.reduce(
    (acc, status) => {
      acc[status] = filteredTasks.filter((t) => t.status === status);
      return acc;
    },
    {} as Record<AdminTaskStatus, AdminTask[]>
  );

  return (
    <AppShell panel="admin" user={{ name: "", role: "", initials: "" }} pageTitle="To-Do List">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Admin Tasks</h2>
          <p className="text-sm text-muted-foreground">Manage your high-level tasks and activities.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-brand)] hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Create Task
        </button>
      </div>

      {/* Date Filter Bar */}
      <div className="mb-6 flex items-center gap-2 rounded-xl border border-border bg-muted/30 p-1.5">
        <CalendarDays className="ml-1.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="flex flex-1 flex-wrap gap-1">
          {DATE_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setDateFilter(f.key)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                dateFilter === f.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {dateFilter !== "all" && (
          <span className="mr-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary">
            {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {STATUSES.map((status) => (
          <div key={status} className="flex flex-col gap-3">
            <div className={`flex items-center justify-between rounded-lg border px-3 py-2 ${STATUS_COLORS[status]}`}>
              <h3 className="font-semibold capitalize tracking-wide">{status}</h3>
              <span className="rounded-full bg-white/50 px-2 py-0.5 text-xs font-bold shadow-sm">
                {groupedTasks[status].length}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {groupedTasks[status].map((task) => (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className="group cursor-pointer rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] transition-all hover:border-primary/50 hover:shadow-md"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h4 className="font-bold leading-tight text-foreground group-hover:text-primary">
                      {task.title}
                    </h4>
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{task.details}</p>
                  <div className="mt-3 flex items-center justify-between text-xs font-medium text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock4 className="h-3 w-3" />
                      {task.date}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground/60">{shortId(task.id)}</span>
                  </div>
                </div>
              ))}
              {groupedTasks[status].length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No tasks
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showAddModal && <CreateTaskModal onClose={() => setShowAddModal(false)} />}
      {selectedTask && (
        <TaskDetailsModal task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}
    </AppShell>
  );
}

function CreateTaskModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const submit = () => {
    if (!title.trim() || !details.trim() || !date) {
      toast.error("Please fill all required fields.");
      return;
    }
    actions.addAdminTask({ title: title.trim(), details: details.trim(), date });
    toast.success("Task created successfully");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-bold text-foreground">Create New Task</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Task Title <span className="text-destructive">*</span>
            </label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Review Q3 Reports"
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Date <span className="text-destructive">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Details <span className="text-destructive">*</span>
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Describe the task..."
              rows={4}
              className="w-full resize-none rounded-lg border border-border bg-background p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-accent"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-brand)] hover:opacity-90"
          >
            Create Task
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskDetailsModal({ task, onClose }: { task: AdminTask; onClose: () => void }) {
  const { adminTaskActivities } = useStoreState();
  const [newActivity, setNewActivity] = useState("");

  const relatedActivities = adminTaskActivities.filter((a) => a.taskId === task.id);

  const addActivity = () => {
    if (!newActivity.trim()) return;
    actions.addAdminTaskActivity(task.id, newActivity.trim());
    setNewActivity("");
    toast.success("Activity logged");
  };

  const changeStatus = (status: AdminTaskStatus) => {
    if (status === task.status) return;
    actions.updateAdminTaskStatus(task.id, status);
    toast.success(`Status updated to ${status}`);
    onClose(); // Close modal to reflect the new state, or keep it open and let it re-render (it will re-render if selectedTask is updated from store, but here we just have a static task prop. Let's close for simplicity or we can just let user re-open). Wait, better not to close if we want them to keep typing. Actually, `task` prop might go stale if we don't watch store. We should derive `currentTask` from store.
  };

  // Derive latest task state from store to prevent stale data
  const latestTask = useStoreState().adminTasks.find(t => t.id === task.id) || task;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={onClose}>
      <div
        className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        style={{ maxHeight: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border bg-muted/20 px-6 py-4">
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">{latestTask.title}</h2>
            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock4 className="h-3.5 w-3.5" />
                {latestTask.date}
              </span>
              <span className="font-mono text-[10px] uppercase">{shortId(latestTask.id)}</span>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-8 grid gap-8 md:grid-cols-2">
            {/* Task Details */}
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Task Details
              </label>
              <div className="min-h-[80px] rounded-xl border border-border bg-background p-4 text-sm leading-relaxed text-foreground shadow-sm">
                {latestTask.details}
              </div>
            </div>

            {/* Task Status */}
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Task Status
              </label>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((status) => {
                  const isActive = latestTask.status === status;
                  return (
                    <button
                      key={status}
                      onClick={() => changeStatus(status)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                        isActive
                          ? STATUS_COLORS[status] + " ring-2 ring-primary/20"
                          : "border-border bg-background text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {isActive && <CheckCircle2 className="h-3.5 w-3.5" />}
                      {status}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <hr className="my-6 border-border" />

          {/* Activities Sidebar (Now at bottom) */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display font-bold text-foreground flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Activities & Logs
              </h3>
            </div>
            
            <div className="mb-6 space-y-3">
              {relatedActivities.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  No activities logged yet.
                </p>
              ) : (
                relatedActivities.map((act) => (
                  <div key={act.id} className="rounded-lg border border-border bg-background p-3 shadow-sm">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground">{act.actor}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {act.ts.slice(0, 16).replace("T", " ")}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{act.details}</p>
                  </div>
                ))
              )}
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <textarea
                value={newActivity}
                onChange={(e) => setNewActivity(e.target.value)}
                placeholder="Log a new activity or note..."
                rows={2}
                className="mb-3 w-full resize-none rounded-lg border border-border bg-background p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={addActivity}
                disabled={!newActivity.trim()}
                className="w-full sm:w-auto sm:px-6 rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-brand)] hover:opacity-90 disabled:opacity-50"
              >
                Log Activity
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
