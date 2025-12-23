import { describe, it, expect } from "vitest";
import type { Task, Resource, Project, GanttyFile } from "./index";
import { DEFAULT_STATUSES } from "./index";

describe("Type definitions", () => {
  describe("Task", () => {
    it("can create a valid task object", () => {
      const task: Task = {
        id: "task-1",
        name: "Test Task",
        progress: 50,
        status: "in_progress",
        order: 0,
      };
      expect(task.id).toBe("task-1");
      expect(task.name).toBe("Test Task");
      expect(task.progress).toBe(50);
      expect(task.status).toBe("in_progress");
    });

    it("supports optional properties", () => {
      const task: Task = {
        id: "task-2",
        name: "Full Task",
        description: "A task with all properties",
        parentId: "parent-1",
        startDate: "2024-01-01",
        endDate: "2024-01-31",
        progress: 75,
        status: "review",
        responsibleId: "user-1",
        ballHolderId: "user-2",
        estimatedHours: 40,
        actualHours: 30,
        order: 1,
      };
      expect(task.description).toBe("A task with all properties");
      expect(task.parentId).toBe("parent-1");
    });
  });

  describe("Resource", () => {
    it("can create a valid resource object", () => {
      const resource: Resource = {
        id: "resource-1",
        name: "John Doe",
        color: "#FF5733",
        availability: 100,
      };
      expect(resource.id).toBe("resource-1");
      expect(resource.name).toBe("John Doe");
      expect(resource.color).toBe("#FF5733");
      expect(resource.availability).toBe(100);
    });
  });

  describe("DEFAULT_STATUSES", () => {
    it("has four default statuses", () => {
      expect(DEFAULT_STATUSES).toHaveLength(4);
    });

    it("includes all required statuses", () => {
      const statusIds = DEFAULT_STATUSES.map((s) => s.id);
      expect(statusIds).toContain("not_started");
      expect(statusIds).toContain("in_progress");
      expect(statusIds).toContain("review");
      expect(statusIds).toContain("completed");
    });

    it("has correct order", () => {
      const sorted = [...DEFAULT_STATUSES].sort((a, b) => a.order - b.order);
      expect(sorted[0].id).toBe("not_started");
      expect(sorted[3].id).toBe("completed");
    });
  });

  describe("Project", () => {
    it("can create a valid project object", () => {
      const project: Project = {
        id: "project-1",
        name: "Test Project",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tasks: [],
        resources: [],
        statuses: DEFAULT_STATUSES,
      };
      expect(project.id).toBe("project-1");
      expect(project.tasks).toEqual([]);
    });
  });

  describe("GanttyFile", () => {
    it("can create a valid file format object", () => {
      const file: GanttyFile = {
        version: "1.0.0",
        project: {
          id: "project-1",
          name: "Test Project",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tasks: [],
          resources: [],
          statuses: DEFAULT_STATUSES,
        },
      };
      expect(file.version).toBe("1.0.0");
      expect(file.project.name).toBe("Test Project");
    });
  });
});
