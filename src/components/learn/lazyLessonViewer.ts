import { lazy } from "react";

let lessonViewerModulePromise: Promise<typeof import("./LessonViewer")> | null = null;

function loadLessonViewerModule() {
  lessonViewerModulePromise ??= import("./LessonViewer");
  return lessonViewerModulePromise;
}

export const LazyLessonViewer = lazy(async () => {
  const module = await loadLessonViewerModule();
  return { default: module.LessonViewer };
});

export function prefetchLessonViewer() {
  void loadLessonViewerModule();
}

export function scheduleLessonViewerPrefetch(timeout = 1200) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const win = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

  if (typeof win.requestIdleCallback === "function") {
    const idleHandle = win.requestIdleCallback(() => {
      prefetchLessonViewer();
    }, { timeout });

    return () => {
      win.cancelIdleCallback?.(idleHandle);
    };
  }

  const timeoutHandle = window.setTimeout(() => {
    prefetchLessonViewer();
  }, 150);

  return () => {
    window.clearTimeout(timeoutHandle);
  };
}
