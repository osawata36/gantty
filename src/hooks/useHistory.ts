import { useEffect, useRef, useCallback } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { useHistoryStore } from "@/stores/historyStore";

// Debounce delay for grouping rapid changes (e.g., typing)
const DEBOUNCE_DELAY = 300;

export function useHistory() {
  const project = useProjectStore((state) => state.project);
  const setProject = useProjectStore((state) => state.setProject);
  const markAsModified = useProjectStore((state) => state.markAsModified);

  const pushState = useHistoryStore((state) => state.pushState);
  const undoHistory = useHistoryStore((state) => state.undo);
  const redoHistory = useHistoryStore((state) => state.redo);
  const canUndo = useHistoryStore((state) => state.canUndo);
  const canRedo = useHistoryStore((state) => state.canRedo);
  const clearHistory = useHistoryStore((state) => state.clear);

  const lastProjectRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUndoRedoRef = useRef(false);

  // Subscribe to project changes and record history
  useEffect(() => {
    if (!project) {
      lastProjectRef.current = null;
      return;
    }

    // Skip if this change was caused by undo/redo
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      lastProjectRef.current = JSON.stringify(project);
      return;
    }

    const projectStr = JSON.stringify(project);

    // Skip if nothing changed
    if (projectStr === lastProjectRef.current) {
      return;
    }

    // If this is the first state, record it without debounce
    if (lastProjectRef.current === null) {
      lastProjectRef.current = projectStr;
      return;
    }

    // Debounce to group rapid changes
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Capture the previous state before it changes
    const previousProjectStr = lastProjectRef.current;
    lastProjectRef.current = projectStr;

    debounceTimerRef.current = setTimeout(() => {
      // Push the previous state to history
      const previousProject = JSON.parse(previousProjectStr);
      pushState(previousProject);
    }, DEBOUNCE_DELAY);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [project, pushState]);

  // Clear history when project is reset (e.g., opening a new file)
  useEffect(() => {
    const unsubscribe = useProjectStore.subscribe((state, prevState) => {
      // If project ID changed (new project loaded), clear history
      if (state.project?.id !== prevState.project?.id) {
        clearHistory();
        lastProjectRef.current = state.project ? JSON.stringify(state.project) : null;
      }
    });

    return () => unsubscribe();
  }, [clearHistory]);

  const undo = useCallback(() => {
    if (!project || !canUndo()) return;

    isUndoRedoRef.current = true;
    const previousState = undoHistory(project);

    if (previousState) {
      setProject(previousState);
      markAsModified();
    }
  }, [project, canUndo, undoHistory, setProject, markAsModified]);

  const redo = useCallback(() => {
    if (!project || !canRedo()) return;

    isUndoRedoRef.current = true;
    const nextState = redoHistory(project);

    if (nextState) {
      setProject(nextState);
      markAsModified();
    }
  }, [project, canRedo, redoHistory, setProject, markAsModified]);

  return {
    undo,
    redo,
    canUndo: canUndo(),
    canRedo: canRedo(),
  };
}
