import { create } from "zustand";
import type { Project, Task, Resource, StatusConfig, TaskStatus, TaskDependency, DependencyType } from "@/types";
import { DEFAULT_STATUSES } from "@/types";
import type { FilterConfig } from "@/stores/viewStore";
import { generateUUID } from "@/lib/uuid";

interface ParentDates {
  startDate: string | undefined;
  endDate: string | undefined;
}

// Default colors for resources
const RESOURCE_COLORS = [
  "#3B82F6", // blue
  "#10B981", // green
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#F97316", // orange
];

interface ProjectState {
  project: Project | null;
  filePath: string | null;
  isModified: boolean;
  collapsedTaskIds: Set<string>;
  currentUserId: string | null;
  ballHolderFilter: string | null; // resource ID, "my-ball", or null (show all)

  // Project Actions
  createNewProject: (name: string) => void;
  createDefaultProject: () => void;
  setProject: (project: Project) => void;
  setFilePath: (path: string | null) => void;
  markAsModified: () => void;
  markAsSaved: () => void;
  reset: () => void;

  // Task Actions
  addTask: (name: string) => void;
  addSubTask: (parentId: string, name: string) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  indentTask: (taskId: string) => void;
  outdentTask: (taskId: string) => void;
  setTaskStatus: (taskId: string, status: TaskStatus) => void;
  moveTask: (taskId: string, newParentId: string | undefined) => boolean;
  reorderTask: (
    taskId: string,
    targetTaskId: string,
    position: "before" | "after"
  ) => boolean;

  // Task Collapse/Expand
  toggleTaskCollapse: (taskId: string) => void;
  isTaskCollapsed: (taskId: string) => boolean;

  // Task Calculations
  getParentDates: (taskId: string) => ParentDates;
  getParentProgress: (taskId: string) => number;
  getParentDuration: (taskId: string) => number | undefined;

  // Resource Actions
  addResource: (name: string) => void;
  updateResource: (resourceId: string, updates: Partial<Resource>) => void;
  deleteResource: (resourceId: string) => void;
  getResourceById: (resourceId: string) => Resource | undefined;

  // Status Actions
  addStatus: (id: string, name: string, color: string) => void;
  updateStatus: (statusId: string, updates: Partial<StatusConfig>) => void;
  deleteStatus: (statusId: string) => void;
  reorderStatuses: (orderedIds: string[]) => void;
  getStatusById: (statusId: string) => StatusConfig | undefined;

  // Ball Holder Filter Actions
  setCurrentUserId: (userId: string | null) => void;
  setBallHolderFilter: (filter: string | null) => void;
  getFilteredTasks: (searchQuery?: string, filters?: FilterConfig) => Task[];

  // Dependency Actions
  addDependency: (predecessorId: string, successorId: string, type: DependencyType, lag: number) => boolean;
  updateDependency: (dependencyId: string, updates: Partial<Pick<TaskDependency, 'type' | 'lag'>>) => boolean;
  deleteDependency: (dependencyId: string) => boolean;
  getDependencies: (taskId: string) => TaskDependency[];
}

const initialState = {
  project: null as Project | null,
  filePath: null as string | null,
  isModified: false,
  collapsedTaskIds: new Set<string>(),
  currentUserId: null as string | null,
  ballHolderFilter: null as string | null,
};

export const useProjectStore = create<ProjectState>()((set, get) => ({
  ...initialState,

  createNewProject: (name: string) => {
    const now = new Date().toISOString();
    const project: Project = {
      id: generateUUID(),
      name,
      createdAt: now,
      updatedAt: now,
      tasks: [],
      resources: [],
      statuses: [...DEFAULT_STATUSES],
      dependencies: [],
    };
    set({ project, filePath: null, isModified: false });
  },

  createDefaultProject: () => {
    const now = new Date().toISOString();
    const project: Project = {
      id: generateUUID(),
      name: "無題のプロジェクト",
      createdAt: now,
      updatedAt: now,
      tasks: [],
      resources: [],
      statuses: [...DEFAULT_STATUSES],
      dependencies: [],
    };
    // Mark as modified since the default project hasn't been saved yet
    set({ project, filePath: null, isModified: true });
  },

  setProject: (project: Project) => {
    set({ project, isModified: false });
  },

  setFilePath: (path: string | null) => {
    set({ filePath: path });
  },

  markAsModified: () => {
    set({ isModified: true });
  },

  markAsSaved: () => {
    set({ isModified: false });
  },

  reset: () => {
    set({
      project: null,
      filePath: null,
      isModified: false,
      collapsedTaskIds: new Set<string>(),
      currentUserId: null,
      ballHolderFilter: null,
    });
  },

  addTask: (name: string) => {
    const { project } = get();
    if (!project) return;

    const newTask: Task = {
      id: generateUUID(),
      name,
      progress: 0,
      status: "not_started",
      order: project.tasks.length,
    };

    set({
      project: {
        ...project,
        tasks: [...project.tasks, newTask],
        updatedAt: new Date().toISOString(),
      },
      isModified: true,
    });
  },

  addSubTask: (parentId: string, name: string) => {
    const { project } = get();
    if (!project) return;

    const parentTask = project.tasks.find((t) => t.id === parentId);
    if (!parentTask) return;

    const newTask: Task = {
      id: generateUUID(),
      name,
      parentId,
      progress: 0,
      status: "not_started",
      order: project.tasks.length,
    };

    set({
      project: {
        ...project,
        tasks: [...project.tasks, newTask],
        updatedAt: new Date().toISOString(),
      },
      isModified: true,
    });
  },

  updateTask: (taskId: string, updates: Partial<Task>) => {
    const { project } = get();
    if (!project) return;

    const taskIndex = project.tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) return;

    const currentTask = project.tasks[taskIndex];
    let finalUpdates = { ...updates };

    // Duration-based date calculation
    const newDuration = updates.duration ?? currentTask.duration;
    const newStartDate = updates.startDate ?? currentTask.startDate;
    const newEndDate = updates.endDate ?? currentTask.endDate;

    if (newDuration !== undefined && newDuration > 0) {
      // If startDate is being updated or was set, calculate endDate from duration
      if (updates.startDate !== undefined && newStartDate) {
        const startDate = new Date(newStartDate);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + newDuration - 1);
        finalUpdates.endDate = endDate.toISOString().split("T")[0];
      }
      // If only endDate is being updated without startDate, calculate startDate from duration
      else if (updates.endDate !== undefined && newEndDate && updates.startDate === undefined) {
        const endDate = new Date(newEndDate);
        const startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - newDuration + 1);
        finalUpdates.startDate = startDate.toISOString().split("T")[0];
      }
      // If duration is being updated and there's an existing startDate, recalculate endDate
      else if (updates.duration !== undefined && newStartDate) {
        const startDate = new Date(newStartDate);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + newDuration - 1);
        finalUpdates.endDate = endDate.toISOString().split("T")[0];
      }
      // If duration is being updated and there's only endDate, recalculate startDate
      else if (updates.duration !== undefined && newEndDate && !newStartDate) {
        const endDate = new Date(newEndDate);
        const startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - newDuration + 1);
        finalUpdates.startDate = startDate.toISOString().split("T")[0];
      }
    }

    const updatedTasks = [...project.tasks];
    updatedTasks[taskIndex] = { ...updatedTasks[taskIndex], ...finalUpdates };

    set({
      project: {
        ...project,
        tasks: updatedTasks,
        updatedAt: new Date().toISOString(),
      },
      isModified: true,
    });
  },

  deleteTask: (taskId: string) => {
    const { project } = get();
    if (!project) return;

    const taskIndex = project.tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) return;

    // Collect all descendant task IDs to delete
    const idsToDelete = new Set<string>([taskId]);
    const collectDescendants = (parentId: string) => {
      project.tasks
        .filter((t) => t.parentId === parentId)
        .forEach((child) => {
          idsToDelete.add(child.id);
          collectDescendants(child.id);
        });
    };
    collectDescendants(taskId);

    // Remove dependencies related to deleted tasks
    const filteredDependencies = (project.dependencies || []).filter(
      (d) => !idsToDelete.has(d.predecessorId) && !idsToDelete.has(d.successorId)
    );

    set({
      project: {
        ...project,
        tasks: project.tasks.filter((t) => !idsToDelete.has(t.id)),
        dependencies: filteredDependencies,
        updatedAt: new Date().toISOString(),
      },
      isModified: true,
    });
  },

  indentTask: (taskId: string) => {
    const { project } = get();
    if (!project) return;

    const task = project.tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Find siblings (tasks with the same parentId)
    const siblings = project.tasks.filter(
      (t) => t.parentId === task.parentId && t.id !== taskId
    );

    // Find the previous sibling (based on order)
    const previousSibling = siblings
      .filter((s) => s.order < task.order)
      .sort((a, b) => b.order - a.order)[0];

    if (!previousSibling) return;

    // Make task a child of previous sibling
    const updatedTasks = project.tasks.map((t) =>
      t.id === taskId ? { ...t, parentId: previousSibling.id } : t
    );

    set({
      project: {
        ...project,
        tasks: updatedTasks,
        updatedAt: new Date().toISOString(),
      },
      isModified: true,
    });
  },

  outdentTask: (taskId: string) => {
    const { project } = get();
    if (!project) return;

    const task = project.tasks.find((t) => t.id === taskId);
    if (!task || !task.parentId) return;

    const parentTask = project.tasks.find((t) => t.id === task.parentId);
    if (!parentTask) return;

    // Make task a sibling of parent (set parentId to parent's parentId)
    const updatedTasks = project.tasks.map((t) =>
      t.id === taskId ? { ...t, parentId: parentTask.parentId } : t
    );

    set({
      project: {
        ...project,
        tasks: updatedTasks,
        updatedAt: new Date().toISOString(),
      },
      isModified: true,
    });
  },

  moveTask: (taskId: string, newParentId: string | undefined): boolean => {
    const { project } = get();
    if (!project) return false;

    const task = project.tasks.find((t) => t.id === taskId);
    if (!task) return false;

    // Cannot move to self
    if (newParentId === taskId) return false;

    // Check for circular reference: newParentId cannot be a descendant of taskId
    if (newParentId) {
      const isDescendant = (parentId: string, targetId: string): boolean => {
        const children = project.tasks.filter((t) => t.parentId === parentId);
        for (const child of children) {
          if (child.id === targetId) return true;
          if (isDescendant(child.id, targetId)) return true;
        }
        return false;
      };

      if (isDescendant(taskId, newParentId)) {
        return false;
      }
    }

    const updatedTasks = project.tasks.map((t) =>
      t.id === taskId ? { ...t, parentId: newParentId } : t
    );

    set({
      project: {
        ...project,
        tasks: updatedTasks,
        updatedAt: new Date().toISOString(),
      },
      isModified: true,
    });

    return true;
  },

  reorderTask: (
    taskId: string,
    targetTaskId: string,
    position: "before" | "after"
  ): boolean => {
    const { project } = get();
    if (!project) return false;

    // Cannot reorder to self
    if (taskId === targetTaskId) return false;

    const task = project.tasks.find((t) => t.id === taskId);
    const targetTask = project.tasks.find((t) => t.id === targetTaskId);

    if (!task || !targetTask) return false;

    // Can only reorder within the same hierarchy level (same parentId)
    if (task.parentId !== targetTask.parentId) return false;

    // Get all siblings (tasks with the same parentId)
    const siblings = project.tasks
      .filter((t) => t.parentId === task.parentId)
      .sort((a, b) => a.order - b.order);

    // Remove the task from the siblings list
    const siblingsWithoutTask = siblings.filter((t) => t.id !== taskId);

    // Find the target index
    const targetIndex = siblingsWithoutTask.findIndex(
      (t) => t.id === targetTaskId
    );

    // Calculate the new position
    const newIndex = position === "before" ? targetIndex : targetIndex + 1;

    // Insert the task at the new position
    siblingsWithoutTask.splice(newIndex, 0, task);

    // Update order for all siblings
    const updatedTasks = project.tasks.map((t) => {
      const siblingIndex = siblingsWithoutTask.findIndex((s) => s.id === t.id);
      if (siblingIndex !== -1) {
        return { ...t, order: siblingIndex };
      }
      return t;
    });

    set({
      project: {
        ...project,
        tasks: updatedTasks,
        updatedAt: new Date().toISOString(),
      },
      isModified: true,
    });

    return true;
  },

  toggleTaskCollapse: (taskId: string) => {
    const { collapsedTaskIds } = get();
    const newCollapsedIds = new Set(collapsedTaskIds);
    if (newCollapsedIds.has(taskId)) {
      newCollapsedIds.delete(taskId);
    } else {
      newCollapsedIds.add(taskId);
    }
    set({ collapsedTaskIds: newCollapsedIds });
  },

  isTaskCollapsed: (taskId: string): boolean => {
    const { collapsedTaskIds } = get();
    return collapsedTaskIds.has(taskId);
  },

  getParentDates: (taskId: string): ParentDates => {
    const { project } = get();
    if (!project) return { startDate: undefined, endDate: undefined };

    // Find direct children of this task
    const children = project.tasks.filter((t) => t.parentId === taskId);
    if (children.length === 0) {
      return { startDate: undefined, endDate: undefined };
    }

    // Collect all start dates and find the earliest
    const startDates = children
      .map((c) => c.startDate)
      .filter((d): d is string => d !== undefined);
    const endDates = children
      .map((c) => c.endDate)
      .filter((d): d is string => d !== undefined);

    const startDate =
      startDates.length > 0
        ? startDates.sort()[0] // ISO date strings sort correctly
        : undefined;
    const endDate =
      endDates.length > 0
        ? endDates.sort().reverse()[0] // Latest date
        : undefined;

    return { startDate, endDate };
  },

  getParentProgress: (taskId: string): number => {
    const { project, getParentProgress } = get();
    if (!project) return 0;

    // Find direct children of this task
    const children = project.tasks.filter((t) => t.parentId === taskId);
    if (children.length === 0) {
      return 0;
    }

    // Check if any child has estimated hours
    const hasEstimatedHours = children.some(
      (c) => c.estimatedHours !== undefined && c.estimatedHours > 0
    );

    if (hasEstimatedHours) {
      // Weighted average by estimated hours
      let totalHours = 0;
      let completedHours = 0;

      for (const child of children) {
        const childChildren = project.tasks.filter(
          (t) => t.parentId === child.id
        );
        const childProgress =
          childChildren.length > 0
            ? getParentProgress(child.id)
            : child.progress;

        const hours = child.estimatedHours || 0;
        totalHours += hours;
        completedHours += (hours * childProgress) / 100;
      }

      if (totalHours === 0) return 0;
      return Math.round((completedHours / totalHours) * 100);
    } else {
      // Simple average
      let totalProgress = 0;
      for (const child of children) {
        const childChildren = project.tasks.filter(
          (t) => t.parentId === child.id
        );
        const childProgress =
          childChildren.length > 0
            ? getParentProgress(child.id)
            : child.progress;
        totalProgress += childProgress;
      }
      return Math.round(totalProgress / children.length);
    }
  },

  getParentDuration: (taskId: string): number | undefined => {
    const { project, getParentDuration } = get();
    if (!project) return undefined;

    // Find direct children of this task
    const children = project.tasks.filter((t) => t.parentId === taskId);
    if (children.length === 0) {
      return undefined;
    }

    // Sum up all child durations (including nested children)
    let totalDuration = 0;
    for (const child of children) {
      const childChildren = project.tasks.filter((t) => t.parentId === child.id);
      if (childChildren.length > 0) {
        // Recursively get duration of nested parent
        const childDuration = getParentDuration(child.id);
        if (childDuration != null) {
          totalDuration += childDuration;
        }
      } else {
        // Leaf task - use its duration
        if (child.duration != null) {
          totalDuration += child.duration;
        }
      }
    }

    return totalDuration > 0 ? totalDuration : undefined;
  },

  // Resource Actions
  addResource: (name: string) => {
    const { project } = get();
    if (!project) return;

    const colorIndex = project.resources.length % RESOURCE_COLORS.length;
    const newResource: Resource = {
      id: generateUUID(),
      name,
      color: RESOURCE_COLORS[colorIndex],
      availability: 100,
    };

    set({
      project: {
        ...project,
        resources: [...project.resources, newResource],
        updatedAt: new Date().toISOString(),
      },
      isModified: true,
    });
  },

  updateResource: (resourceId: string, updates: Partial<Resource>) => {
    const { project } = get();
    if (!project) return;

    const resourceIndex = project.resources.findIndex(
      (r) => r.id === resourceId
    );
    if (resourceIndex === -1) return;

    const updatedResources = [...project.resources];
    updatedResources[resourceIndex] = {
      ...updatedResources[resourceIndex],
      ...updates,
    };

    set({
      project: {
        ...project,
        resources: updatedResources,
        updatedAt: new Date().toISOString(),
      },
      isModified: true,
    });
  },

  deleteResource: (resourceId: string) => {
    const { project } = get();
    if (!project) return;

    const resourceIndex = project.resources.findIndex(
      (r) => r.id === resourceId
    );
    if (resourceIndex === -1) return;

    // Clear responsibleId and ballHolderId from tasks that reference this resource
    const updatedTasks = project.tasks.map((task) => {
      const updates: Partial<Task> = {};
      if (task.responsibleId === resourceId) {
        updates.responsibleId = undefined;
      }
      if (task.ballHolderId === resourceId) {
        updates.ballHolderId = undefined;
      }
      return Object.keys(updates).length > 0 ? { ...task, ...updates } : task;
    });

    set({
      project: {
        ...project,
        resources: project.resources.filter((r) => r.id !== resourceId),
        tasks: updatedTasks,
        updatedAt: new Date().toISOString(),
      },
      isModified: true,
    });
  },

  getResourceById: (resourceId: string): Resource | undefined => {
    const { project } = get();
    if (!project) return undefined;
    return project.resources.find((r) => r.id === resourceId);
  },

  // Status Actions
  setTaskStatus: (taskId: string, status: TaskStatus) => {
    const { project } = get();
    if (!project) return;

    const taskIndex = project.tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) return;

    const updatedTasks = [...project.tasks];
    const updates: Partial<Task> = { status };

    // If status is "completed", set progress to 100
    if (status === "completed") {
      updates.progress = 100;
    }

    updatedTasks[taskIndex] = { ...updatedTasks[taskIndex], ...updates };

    set({
      project: {
        ...project,
        tasks: updatedTasks,
        updatedAt: new Date().toISOString(),
      },
      isModified: true,
    });
  },

  addStatus: (id: string, name: string, color: string) => {
    const { project } = get();
    if (!project) return;

    const newStatus: StatusConfig = {
      id,
      name,
      color,
      order: project.statuses.length,
    };

    set({
      project: {
        ...project,
        statuses: [...project.statuses, newStatus],
        updatedAt: new Date().toISOString(),
      },
      isModified: true,
    });
  },

  updateStatus: (statusId: string, updates: Partial<StatusConfig>) => {
    const { project } = get();
    if (!project) return;

    const statusIndex = project.statuses.findIndex((s) => s.id === statusId);
    if (statusIndex === -1) return;

    const updatedStatuses = [...project.statuses];
    updatedStatuses[statusIndex] = {
      ...updatedStatuses[statusIndex],
      ...updates,
    };

    set({
      project: {
        ...project,
        statuses: updatedStatuses,
        updatedAt: new Date().toISOString(),
      },
      isModified: true,
    });
  },

  deleteStatus: (statusId: string) => {
    const { project } = get();
    if (!project) return;

    // Cannot delete if only one status remains
    if (project.statuses.length <= 1) return;

    const statusIndex = project.statuses.findIndex((s) => s.id === statusId);
    if (statusIndex === -1) return;

    // Get the first status (to use as fallback for tasks with deleted status)
    const firstStatusId = project.statuses.find((s) => s.id !== statusId)?.id;
    if (!firstStatusId) return;

    // Update tasks that have the deleted status
    const updatedTasks = project.tasks.map((task) => {
      if (task.status === statusId) {
        return { ...task, status: firstStatusId as TaskStatus };
      }
      return task;
    });

    set({
      project: {
        ...project,
        statuses: project.statuses.filter((s) => s.id !== statusId),
        tasks: updatedTasks,
        updatedAt: new Date().toISOString(),
      },
      isModified: true,
    });
  },

  reorderStatuses: (orderedIds: string[]) => {
    const { project } = get();
    if (!project) return;

    const reorderedStatuses = orderedIds
      .map((id, index) => {
        const status = project.statuses.find((s) => s.id === id);
        if (!status) return null;
        return { ...status, order: index };
      })
      .filter((s): s is StatusConfig => s !== null);

    set({
      project: {
        ...project,
        statuses: reorderedStatuses,
        updatedAt: new Date().toISOString(),
      },
      isModified: true,
    });
  },

  getStatusById: (statusId: string): StatusConfig | undefined => {
    const { project } = get();
    if (!project) return undefined;
    return project.statuses.find((s) => s.id === statusId);
  },

  // Ball Holder Filter Actions
  setCurrentUserId: (userId: string | null) => {
    set({ currentUserId: userId });
  },

  setBallHolderFilter: (filter: string | null) => {
    set({ ballHolderFilter: filter });
  },

  getFilteredTasks: (searchQuery?: string, filters?: FilterConfig): Task[] => {
    const { project, ballHolderFilter, currentUserId } = get();
    if (!project) return [];

    let tasks = project.tasks;

    // Apply ball holder filter first
    if (ballHolderFilter !== null) {
      if (ballHolderFilter === "my-ball") {
        if (!currentUserId) {
          return [];
        }
        tasks = tasks.filter((task) => task.ballHolderId === currentUserId);
      } else {
        tasks = tasks.filter((task) => task.ballHolderId === ballHolderFilter);
      }
    }

    // Apply search query filter
    if (searchQuery && searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      tasks = tasks.filter((task) =>
        task.name.toLowerCase().includes(query)
      );
    }

    // Apply advanced filters
    if (filters) {
      // Status filter
      if (filters.statusIds.length > 0) {
        tasks = tasks.filter((task) =>
          filters.statusIds.includes(task.status)
        );
      }

      // Responsible filter
      if (filters.responsibleIds.length > 0) {
        tasks = tasks.filter(
          (task) =>
            task.responsibleId && filters.responsibleIds.includes(task.responsibleId)
        );
      }

      // Due date filter
      if (filters.dueDate) {
        // Use local date string for comparison (YYYY-MM-DD format)
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

        tasks = tasks.filter((task) => {
          if (!task.endDate) return false;

          switch (filters.dueDate) {
            case "today":
              return task.endDate === todayStr;
            case "overdue":
              return task.endDate < todayStr;
            case "this_week": {
              const weekEnd = new Date(now);
              weekEnd.setDate(now.getDate() + (7 - now.getDay()));
              const weekEndStr = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, "0")}-${String(weekEnd.getDate()).padStart(2, "0")}`;
              return task.endDate >= todayStr && task.endDate <= weekEndStr;
            }
            default:
              return true;
          }
        });
      }
    }

    return tasks;
  },

  // Dependency Actions
  addDependency: (predecessorId: string, successorId: string, type: DependencyType, lag: number): boolean => {
    const { project } = get();
    if (!project) return false;

    // Validate: both tasks must exist
    const predecessor = project.tasks.find(t => t.id === predecessorId);
    const successor = project.tasks.find(t => t.id === successorId);
    if (!predecessor || !successor) return false;

    // Validate: no self-dependency
    if (predecessorId === successorId) return false;

    // Validate: no duplicate dependency for the same pair
    const dependencies = project.dependencies || [];
    const existingDep = dependencies.find(
      d => d.predecessorId === predecessorId && d.successorId === successorId
    );
    if (existingDep) return false;

    const newDependency: TaskDependency = {
      id: generateUUID(),
      predecessorId,
      successorId,
      type,
      lag,
    };

    set({
      project: {
        ...project,
        dependencies: [...dependencies, newDependency],
        updatedAt: new Date().toISOString(),
      },
      isModified: true,
    });

    return true;
  },

  updateDependency: (dependencyId: string, updates: Partial<Pick<TaskDependency, 'type' | 'lag'>>): boolean => {
    const { project } = get();
    if (!project) return false;

    const dependencies = project.dependencies || [];
    const depIndex = dependencies.findIndex(d => d.id === dependencyId);
    if (depIndex === -1) return false;

    const updatedDependencies = [...dependencies];
    updatedDependencies[depIndex] = {
      ...updatedDependencies[depIndex],
      ...updates,
    };

    set({
      project: {
        ...project,
        dependencies: updatedDependencies,
        updatedAt: new Date().toISOString(),
      },
      isModified: true,
    });

    return true;
  },

  deleteDependency: (dependencyId: string): boolean => {
    const { project } = get();
    if (!project) return false;

    const dependencies = project.dependencies || [];
    const depIndex = dependencies.findIndex(d => d.id === dependencyId);
    if (depIndex === -1) return false;

    set({
      project: {
        ...project,
        dependencies: dependencies.filter(d => d.id !== dependencyId),
        updatedAt: new Date().toISOString(),
      },
      isModified: true,
    });

    return true;
  },

  getDependencies: (taskId: string): TaskDependency[] => {
    const { project } = get();
    if (!project) return [];

    const dependencies = project.dependencies || [];
    return dependencies.filter(
      d => d.predecessorId === taskId || d.successorId === taskId
    );
  },
}));

// E2Eテスト用: 開発環境でのみストアをウィンドウに公開
if (import.meta.env.DEV) {
  (window as unknown as { __projectStore: typeof useProjectStore }).
    __projectStore = useProjectStore;
}
