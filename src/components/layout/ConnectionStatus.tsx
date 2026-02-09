"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ClaudeStatus {
  connected: boolean;
  version: string | null;
  providerName?: string;
  providerType?: string;
  usesClaudeCode: boolean;
}

export function ConnectionStatus() {
  const [status, setStatus] = useState<ClaudeStatus | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/claude-status");
      if (res.ok) {
        const data: ClaudeStatus = await res.json();
        setStatus(data);
      }
    } catch {
      setStatus({ connected: false, version: null, usesClaudeCode: true });
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const connected = status?.connected ?? false;

  return (
    <>
      <button
        onClick={() => setDialogOpen(true)}
        className={cn(
          "flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium transition-colors",
          status === null
            ? "bg-muted text-muted-foreground"
            : connected
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
              : "bg-red-500/15 text-red-700 dark:text-red-400"
        )}
      >
        <span
          className={cn(
            "block h-1.5 w-1.5 shrink-0 rounded-full",
            status === null
              ? "bg-muted-foreground/40"
              : connected
                ? "bg-emerald-500"
                : "bg-red-500"
          )}
        />
        {status === null
          ? "Checking"
          : connected
            ? "Connected"
            : "Disconnected"}
      </button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {status?.usesClaudeCode
                ? (connected ? "Claude Code Connected" : "Claude Code Not Connected")
                : (connected ? "Provider Connected" : "Not Connected")
              }
            </DialogTitle>
            <DialogDescription>
              {status?.usesClaudeCode
                ? (connected
                    ? `Claude Code CLI v${status?.version} is running and ready.`
                    : "Claude Code CLI is required to use this application.")
                : (connected
                    ? `Connected to ${status?.providerName || 'provider'} and ready.`
                    : "No provider configured.")
              }
            </DialogDescription>
          </DialogHeader>

          {connected ? (
            <div className="space-y-3 text-sm">
              <div className={cn(
                "flex items-center gap-3 rounded-lg px-4 py-3",
                status?.usesClaudeCode ? "bg-emerald-500/10" : "bg-blue-500/10"
              )}>
                <span className={cn(
                  "block h-2.5 w-2.5 shrink-0 rounded-full",
                  status?.usesClaudeCode ? "bg-emerald-500" : "bg-blue-500"
                )} />
                <div>
                  <p className={cn(
                    "font-medium",
                    status?.usesClaudeCode ? "text-emerald-700 dark:text-emerald-400" : "text-blue-700 dark:text-blue-400"
                  )}>
                    {status?.usesClaudeCode ? "Active" : "Connected"}
                  </p>
                  {status?.usesClaudeCode ? (
                    <p className="text-xs text-muted-foreground">Version {status?.version}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">{status?.providerName || 'Provider'}</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-3 rounded-lg bg-red-500/10 px-4 py-3">
                <span className="block h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
                <p className="font-medium text-red-700 dark:text-red-400">Not detected</p>
              </div>

              {status?.usesClaudeCode ? (
                <>
                  <div>
                    <h4 className="font-medium mb-1.5">1. Install Claude Code</h4>
                    <code className="block rounded-md bg-muted px-3 py-2 text-xs">
                      npm install -g @anthropic-ai/claude-code
                    </code>
                  </div>

                  <div>
                    <h4 className="font-medium mb-1.5">2. Authenticate</h4>
                    <code className="block rounded-md bg-muted px-3 py-2 text-xs">
                      claude login
                    </code>
                  </div>

                  <div>
                    <h4 className="font-medium mb-1.5">3. Verify Installation</h4>
                    <code className="block rounded-md bg-muted px-3 py-2 text-xs">
                      claude --version
                    </code>
                  </div>
                </>
              ) : (
                <div>
                  <p className="text-muted-foreground">Please configure a provider in Settings.</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                checkStatus();
              }}
            >
              Refresh
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
