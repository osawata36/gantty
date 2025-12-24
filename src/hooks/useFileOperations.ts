import { useCallback } from "react";
import { save, open } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import { useProjectStore } from "@/stores/projectStore";
import { serializeProject, deserializeProject } from "@/lib/fileUtils";

const GANTTY_FILTER = [{ name: "Gantty Project", extensions: ["gantty"] }];

export function useFileOperations() {
  const project = useProjectStore((state) => state.project);
  const filePath = useProjectStore((state) => state.filePath);
  const setFilePath = useProjectStore((state) => state.setFilePath);
  const setProject = useProjectStore((state) => state.setProject);
  const markAsSaved = useProjectStore((state) => state.markAsSaved);
  const createProject = useProjectStore((state) => state.createNewProject);

  const saveProject = useCallback(async (): Promise<boolean> => {
    if (!project) {
      return false;
    }

    let targetPath = filePath;

    // If no existing path, show save dialog
    if (!targetPath) {
      const selectedPath = await save({
        filters: GANTTY_FILTER,
        defaultPath: `${project.name}.gantty`,
      });

      if (!selectedPath) {
        return false;
      }

      targetPath = selectedPath;
    }

    try {
      const content = serializeProject(project);
      await writeTextFile(targetPath, content);
      setFilePath(targetPath);
      markAsSaved();
      return true;
    } catch (error) {
      console.error("Failed to save project:", error);
      return false;
    }
  }, [project, filePath, setFilePath, markAsSaved]);

  const saveProjectAs = useCallback(async (): Promise<boolean> => {
    if (!project) {
      return false;
    }

    const selectedPath = await save({
      filters: GANTTY_FILTER,
      defaultPath: filePath || `${project.name}.gantty`,
    });

    if (!selectedPath) {
      return false;
    }

    try {
      const content = serializeProject(project);
      await writeTextFile(selectedPath, content);
      setFilePath(selectedPath);
      markAsSaved();
      return true;
    } catch (error) {
      console.error("Failed to save project:", error);
      return false;
    }
  }, [project, filePath, setFilePath, markAsSaved]);

  const openProject = useCallback(async (): Promise<boolean> => {
    const selectedPath = await open({
      filters: GANTTY_FILTER,
      multiple: false,
    });

    if (!selectedPath || typeof selectedPath !== "string") {
      return false;
    }

    try {
      const content = await readTextFile(selectedPath);
      const result = deserializeProject(content);

      if (!result.success) {
        console.error("Failed to parse project:", result.error);
        return false;
      }

      setProject(result.project);
      setFilePath(selectedPath);
      return true;
    } catch (error) {
      console.error("Failed to open project:", error);
      return false;
    }
  }, [setProject, setFilePath]);

  const createNewProject = useCallback(
    (name: string) => {
      createProject(name);
    },
    [createProject]
  );

  return {
    saveProject,
    saveProjectAs,
    openProject,
    createNewProject,
  };
}
