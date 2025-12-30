import { useState, useEffect, useCallback, useRef } from "react";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { useProjectStore } from "@/stores/projectStore";
import { serializeProject } from "@/lib/fileUtils";

export type SaveStatus = "saved" | "modified" | "saving";

interface UseAutoSaveOptions {
  delayMs?: number;
}

const DEFAULT_DELAY_MS = 30000; // 30 seconds

export function useAutoSave(options: UseAutoSaveOptions = {}) {
  const { delayMs = DEFAULT_DELAY_MS } = options;

  const project = useProjectStore((state) => state.project);
  const filePath = useProjectStore((state) => state.filePath);
  const isModified = useProjectStore((state) => state.isModified);
  const markAsSaved = useProjectStore((state) => state.markAsSaved);

  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update save status based on isModified
  useEffect(() => {
    if (!isModified) {
      setSaveStatus("saved");
    } else {
      setSaveStatus("modified");
    }
  }, [isModified]);

  const performSave = useCallback(async () => {
    if (!project || !filePath) {
      return false;
    }

    setSaveStatus("saving");

    try {
      const content = serializeProject(project);
      await writeTextFile(filePath, content);
      markAsSaved();
      setSaveStatus("saved");
      return true;
    } catch (error) {
      console.error("Auto save failed:", error);
      setSaveStatus("modified");
      return false;
    }
  }, [project, filePath, markAsSaved]);

  // Set up auto save timer
  useEffect(() => {
    // Clear existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Don't schedule if disabled, not modified, or no file path
    if (!isAutoSaveEnabled || !isModified || !filePath) {
      return;
    }

    // Schedule auto save
    timerRef.current = setTimeout(() => {
      performSave();
    }, delayMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isAutoSaveEnabled, isModified, filePath, delayMs, performSave]);

  const toggleAutoSave = useCallback(() => {
    setIsAutoSaveEnabled((prev) => !prev);
  }, []);

  return {
    isAutoSaveEnabled,
    saveStatus,
    toggleAutoSave,
    performSave,
  };
}
