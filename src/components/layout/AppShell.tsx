"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NavRail } from "./NavRail";
import { ChatListPanel } from "./ChatListPanel";
import { RightPanel } from "./RightPanel";
import { PanelContext, type PanelContent } from "@/hooks/usePanel";
import { HugeiconsIcon } from "@hugeicons/react";
import { StructureFolderIcon, PanelRightCloseIcon } from "@hugeicons/core-free-icons";

const LG_BREAKPOINT = 1024;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const [chatListOpen, setChatListOpenRaw] = useState(false);

  // Panel state
  const isChatRoute = pathname.startsWith("/chat/") || pathname === "/chat";
  const isChatDetailRoute = pathname.startsWith("/chat/");

  // Auto-close chat list when leaving chat routes
  const setChatListOpen = useCallback((open: boolean) => {
    setChatListOpenRaw(open);
  }, []);

  useEffect(() => {
    if (!isChatRoute) {
      setChatListOpenRaw(false);
    }
  }, [isChatRoute]);

  const [panelOpen, setPanelOpenRaw] = useState(false);
  const [panelContent, setPanelContent] = useState<PanelContent>("files");
  const [workingDirectory, setWorkingDirectory] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [sessionTitle, setSessionTitle] = useState("");
  const [streamingSessionId, setStreamingSessionId] = useState("");
  const [pendingApprovalSessionId, setPendingApprovalSessionId] = useState("");

  // 右侧面板宽度（支持拖拽调整），默认约等于 w-72
  const [rightPanelWidth, setRightPanelWidth] = useState(288);
  const resizeStateRef = useRef<{ startX: number; startWidth: number } | null>(null);

  // Auto-open panel on chat detail routes, close on others
  useEffect(() => {
    setPanelOpenRaw(isChatDetailRoute);
  }, [isChatDetailRoute]);

  const setPanelOpen = useCallback((open: boolean) => {
    setPanelOpenRaw(open);
  }, []);

  // Keep chat list state in sync when resizing across the breakpoint (only on chat routes)
  useEffect(() => {
    if (!isChatRoute) return;
    const mql = window.matchMedia(`(min-width: ${LG_BREAKPOINT}px)`);
    const handler = (e: MediaQueryListEvent) => setChatListOpenRaw(e.matches);
    mql.addEventListener("change", handler);
    setChatListOpenRaw(mql.matches);
    return () => mql.removeEventListener("change", handler);
  }, [isChatRoute]);

  const panelContextValue = useMemo(
    () => ({
      panelOpen,
      setPanelOpen,
      panelContent,
      setPanelContent,
      workingDirectory,
      setWorkingDirectory,
      sessionId,
      setSessionId,
      sessionTitle,
      setSessionTitle,
      streamingSessionId,
      setStreamingSessionId,
      pendingApprovalSessionId,
      setPendingApprovalSessionId,
    }),
    [
      panelOpen,
      setPanelOpen,
      panelContent,
      workingDirectory,
      sessionId,
      sessionTitle,
      streamingSessionId,
      pendingApprovalSessionId,
    ]
  );

  // 拖拽右侧分割线，调整面板宽度
  const handleResizeMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      // 只响应鼠标左键
      if (event.button !== 0) return;
      event.preventDefault();

      resizeStateRef.current = {
        startX: event.clientX,
        startWidth: rightPanelWidth,
      };

      const handleMouseMove = (e: MouseEvent) => {
        if (!resizeStateRef.current) return;
        const deltaX = resizeStateRef.current.startX - e.clientX; // 往左拖，右侧面板变宽
        const nextWidth = resizeStateRef.current.startWidth + deltaX;
        // 最小宽度限制为 200，最大宽度动态接近窗口宽度，保证主聊天区至少留出 320px
        const minWidth = 200;
        const maxWidth = Math.max(minWidth, window.innerWidth - 320);
        const clamped = Math.min(Math.max(nextWidth, minWidth), maxWidth);
        setRightPanelWidth(clamped);
      };

      const handleMouseUp = () => {
        resizeStateRef.current = null;
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [rightPanelWidth]
  );

  return (
    <PanelContext.Provider value={panelContextValue}>
      <TooltipProvider delayDuration={300}>
        <div className="flex h-screen overflow-hidden">
          <NavRail
            chatListOpen={chatListOpen}
            onToggleChatList={() => setChatListOpen(!chatListOpen)}
          />
          <ChatListPanel open={chatListOpen} />
          <div className="flex min-w-0 flex-1 overflow-hidden">
            {/* 中间聊天区域 */}
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              {/* Electron draggable title bar region */}
              <div
                className="h-11 w-full shrink-0"
                style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
              />
              <main className="relative flex-1 overflow-hidden">{children}</main>
            </div>

            {/* 右侧面板（仅在对话详情页显示） */}
            {isChatDetailRoute && (
              <>
                {/* 聊天区域与右侧面板之间的分割线（可拖拽） */}
                <div
                  className="hidden relative h-full w-[14px] cursor-col-resize bg-border/60 hover:bg-border lg:block"
                  style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
                  onMouseDown={handleResizeMouseDown}
                >
                  {/* 分割线中间的开/关面板图标 */}
                  <button
                    type="button"
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background p-1.5 shadow-md hover:bg-accent hover:text-accent-foreground"
                    onClick={(e) => {
                      e.stopPropagation(); // 不触发拖拽
                      setPanelOpen(!panelOpen);
                    }}
                  >
                    <HugeiconsIcon
                      icon={panelOpen ? PanelRightCloseIcon : StructureFolderIcon}
                      className="h-4 w-4 text-foreground"
                    />
                    <span className="sr-only">
                      {panelOpen ? "Close panel" : "Open panel"}
                    </span>
                  </button>
                </div>
                {panelOpen && <RightPanel width={rightPanelWidth} />}
              </>
            )}
          </div>
        </div>
      </TooltipProvider>
    </PanelContext.Provider>
  );
}
