import { useCallback, useRef } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { serializeProject, deserializeProject } from "@/lib/fileUtils";

/**
 * Download a file in the browser
 */
function downloadFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Extract filename from path or generate default
 */
function getFilename(filePath: string | null, projectName: string): string {
  if (filePath) {
    const parts = filePath.split(/[/\\]/);
    return parts[parts.length - 1];
  }
  return `${projectName}.gantty`;
}

export function useFileOperations() {
  const project = useProjectStore((state) => state.project);
  const filePath = useProjectStore((state) => state.filePath);
  const setFilePath = useProjectStore((state) => state.setFilePath);
  const setProject = useProjectStore((state) => state.setProject);
  const markAsSaved = useProjectStore((state) => state.markAsSaved);
  const createProject = useProjectStore((state) => state.createNewProject);

  // Hidden file input ref for opening files
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const resolveOpenRef = useRef<((success: boolean) => void) | null>(null);

  const saveProject = useCallback(async (): Promise<boolean> => {
    if (!project) {
      return false;
    }

    try {
      const content = serializeProject(project);
      const filename = getFilename(filePath, project.name);
      downloadFile(content, filename);

      // Set file path to the filename (browser doesn't have full path)
      if (!filePath) {
        setFilePath(filename);
      }
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

    try {
      const content = serializeProject(project);
      const filename = getFilename(null, project.name);
      downloadFile(content, filename);
      setFilePath(filename);
      markAsSaved();
      return true;
    } catch (error) {
      console.error("Failed to save project:", error);
      return false;
    }
  }, [project, setFilePath, markAsSaved]);

  const handleFileSelect = useCallback(
    (event: Event) => {
      const input = event.target as HTMLInputElement;
      const file = input.files?.[0];

      if (!file) {
        resolveOpenRef.current?.(false);
        resolveOpenRef.current = null;
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const result = deserializeProject(content);

        if (!result.success) {
          console.error("Failed to parse project:", result.error);
          resolveOpenRef.current?.(false);
          resolveOpenRef.current = null;
          return;
        }

        setProject(result.project);
        setFilePath(file.name);
        resolveOpenRef.current?.(true);
        resolveOpenRef.current = null;
      };

      reader.onerror = () => {
        console.error("Failed to read file");
        resolveOpenRef.current?.(false);
        resolveOpenRef.current = null;
      };

      reader.readAsText(file);

      // Reset input so same file can be selected again
      input.value = "";
    },
    [setProject, setFilePath]
  );

  const openProject = useCallback(async (): Promise<boolean> => {
    return new Promise((resolve) => {
      // Create hidden file input if it doesn't exist
      if (!fileInputRef.current) {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".gantty";
        input.style.display = "none";
        input.addEventListener("change", handleFileSelect);
        input.addEventListener("cancel", () => {
          resolveOpenRef.current?.(false);
          resolveOpenRef.current = null;
        });
        document.body.appendChild(input);
        fileInputRef.current = input;
      }

      resolveOpenRef.current = resolve;
      fileInputRef.current.click();
    });
  }, [handleFileSelect]);

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
