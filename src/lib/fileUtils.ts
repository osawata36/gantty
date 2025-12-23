import type { Project, GanttyFile } from "@/types";

export const GANTTY_FILE_VERSION = "1.0.0";

export type DeserializeResult =
  | { success: true; project: Project }
  | { success: false; error: string };

/**
 * Serializes a project to a JSON string in .gantty file format
 */
export function serializeProject(project: Project): string {
  const file: GanttyFile = {
    version: GANTTY_FILE_VERSION,
    project,
  };
  return JSON.stringify(file, null, 2);
}

/**
 * Deserializes a JSON string to a project
 */
export function deserializeProject(content: string): DeserializeResult {
  try {
    const parsed = JSON.parse(content);

    if (!parsed.version) {
      return { success: false, error: "Invalid file format: missing version" };
    }

    if (!parsed.project) {
      return { success: false, error: "Invalid file format: missing project data" };
    }

    // Validate required project fields
    const project = parsed.project as Project;
    if (!project.id || !project.name) {
      return { success: false, error: "Invalid project: missing required fields" };
    }

    return { success: true, project };
  } catch (error) {
    return {
      success: false,
      error: `Invalid JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
