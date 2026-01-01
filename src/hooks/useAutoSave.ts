import { useState, useEffect, useCallback, useRef } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { serializeProject } from "@/lib/fileUtils";
import { saveToIndexedDB } from "@/lib/browserStorage";

export type SaveStatus = "saved" | "modified" | "saving";

interface UseAutoSaveOptions {
  delayMs?: number;
}

const DEFAULT_DELAY_MS = 2000; // 2 seconds for quick browser auto-save

export function useAutoSave(options: UseAutoSaveOptions = {}) {
  const { delayMs = DEFAULT_DELAY_MS } = options;

  const project = useProjectStore((state) => state.project);
  const isModified = useProjectStore((state) => state.isModified);
  const markAsSaved = useProjectStore((state) => state.markAsSaved);

  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const projectRef = useRef(project);

  // Keep project ref updated for beforeunload handler
  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  // Update save status based on isModified
  useEffect(() => {
    if (!isModified) {
      setSaveStatus("saved");
    } else {
      setSaveStatus("modified");
    }
  }, [isModified]);

  const performSave = useCallback(async () => {
    const currentProject = projectRef.current;
    if (!currentProject) {
      return false;
    }

    setSaveStatus("saving");

    try {
      const content = serializeProject(currentProject);
      // Save to IndexedDB for browser-based auto-save
      await saveToIndexedDB(content);
      markAsSaved();
      setSaveStatus("saved");
      return true;
    } catch (error) {
      console.error("Auto save failed:", error);
      setSaveStatus("modified");
      return false;
    }
  }, [markAsSaved]);

  // Set up auto save timer
  useEffect(() => {
    // Clear existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Don't schedule if disabled or not modified
    if (!isAutoSaveEnabled || !isModified) {
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
  }, [isAutoSaveEnabled, isModified, delayMs, performSave]);

  // Save immediately when user tries to leave the page
  useEffect(() => {
    const handleBeforeUnload = () => {
      const currentProject = projectRef.current;
      if (currentProject && isAutoSaveEnabled) {
        try {
          const content = serializeProject(currentProject);
          // Use synchronous localStorage as fallback for beforeunload
          // IndexedDB is async and may not complete before page unload
          localStorage.setItem("gantty_emergency_save", content);
        } catch (error) {
          console.error("Emergency save failed:", error);
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isAutoSaveEnabled]);

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
