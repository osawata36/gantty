import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  className?: string;
}

export function AppShell({ children, className }: AppShellProps) {
  return (
    <div className={cn("flex h-screen flex-col", className)}>
      {/* Header */}
      <header role="banner" className="flex h-12 items-center border-b px-4">
        <h1 className="text-lg font-semibold">Gantty</h1>
      </header>

      {/* Toolbar */}
      <div role="toolbar" className="flex h-10 items-center border-b px-4">
        {/* Toolbar content will be added later */}
      </div>

      {/* Main Content */}
      <main role="main" className="flex-1 overflow-auto">
        {children}
      </main>

      {/* Status Bar */}
      <footer role="contentinfo" className="flex h-6 items-center border-t px-4 text-xs">
        <span>Ready</span>
      </footer>
    </div>
  );
}
