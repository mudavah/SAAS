"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
}

export default function TasksPage() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    fetch("/api/tasks")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load tasks");
        return r.json();
      })
      .then(setTasks)
      .catch(() => {});
  }, []);

  async function addTask() {
    if (!newTitle.trim()) return;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    });
    if (!res.ok) {
      const data = await res.json();
      toast({ title: "Error", description: data.error || "Failed to add task", variant: "destructive" });
      return;
    }
    const task = await res.json();
    setTasks((prev) => [task, ...prev]);
    setNewTitle("");
  }

  const priorityColor: Record<string, "default" | "warning" | "destructive"> = {
    low: "default",
    medium: "warning",
    high: "destructive",
  };

  return (
    <DashboardShell>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-muted-foreground">Simple project task management</p>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Add a new task..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
          />
          <Button variant="kazi" onClick={addTask}><Plus className="h-4 w-4" /></Button>
        </div>

        <div className="space-y-2">
          {tasks.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No tasks yet. Add one above!</p>
          ) : (
            tasks.map((task) => (
              <Card key={task.id}>
                <CardContent className="flex items-center gap-3 py-3">
                  <button className="text-muted-foreground hover:text-kazi-green">
                    <Check className="h-5 w-5" />
                  </button>
                  <span className={`flex-1 ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                    {task.title}
                  </span>
                  <Badge variant={priorityColor[task.priority]} className="capitalize text-xs">{task.priority}</Badge>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
