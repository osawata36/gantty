import { describe, it, expect } from "vitest";
import { serializeProject, deserializeProject, GANTTY_FILE_VERSION } from "./fileUtils";
import type { Project } from "@/types";
import { DEFAULT_STATUSES } from "@/types";

describe("fileUtils", () => {
  const createTestProject = (): Project => ({
    id: "project-1",
    name: "Test Project",
    description: "A test project",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-02T00:00:00.000Z",
    tasks: [
      {
        id: "task-1",
        name: "Task 1",
        progress: 50,
        status: "in_progress",
        order: 0,
      },
    ],
    resources: [
      {
        id: "resource-1",
        name: "John Doe",
        color: "#FF5733",
        availability: 100,
      },
    ],
    statuses: DEFAULT_STATUSES,
  });

  describe("serializeProject", () => {
    it("serializes a project to JSON string with version", () => {
      const project = createTestProject();
      const serialized = serializeProject(project);
      const parsed = JSON.parse(serialized);

      expect(parsed.version).toBe(GANTTY_FILE_VERSION);
      expect(parsed.project.name).toBe("Test Project");
    });

    it("includes all project data in serialization", () => {
      const project = createTestProject();
      const serialized = serializeProject(project);
      const parsed = JSON.parse(serialized);

      expect(parsed.project.tasks).toHaveLength(1);
      expect(parsed.project.resources).toHaveLength(1);
      expect(parsed.project.statuses).toHaveLength(4);
    });

    it("produces valid JSON", () => {
      const project = createTestProject();
      const serialized = serializeProject(project);

      expect(() => JSON.parse(serialized)).not.toThrow();
    });
  });

  describe("deserializeProject", () => {
    it("deserializes a valid JSON string to project", () => {
      const project = createTestProject();
      const serialized = serializeProject(project);
      const result = deserializeProject(serialized);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.project.name).toBe("Test Project");
      }
    });

    it("returns error for invalid JSON", () => {
      const result = deserializeProject("not valid json");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid");
      }
    });

    it("returns error for missing version", () => {
      const invalidFile = JSON.stringify({ project: createTestProject() });
      const result = deserializeProject(invalidFile);

      expect(result.success).toBe(false);
    });

    it("returns error for missing project data", () => {
      const invalidFile = JSON.stringify({ version: "1.0.0" });
      const result = deserializeProject(invalidFile);

      expect(result.success).toBe(false);
    });

    it("preserves all project data after round-trip", () => {
      const project = createTestProject();
      const serialized = serializeProject(project);
      const result = deserializeProject(serialized);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.project.id).toBe(project.id);
        expect(result.project.tasks).toHaveLength(1);
        expect(result.project.tasks[0].name).toBe("Task 1");
        expect(result.project.resources[0].name).toBe("John Doe");
      }
    });
  });
});
