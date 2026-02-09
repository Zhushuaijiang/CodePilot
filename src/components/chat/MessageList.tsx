'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Message, PermissionRequestEvent } from '@/types';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  ConversationEmptyState,
} from '@/components/ai-elements/conversation';
import { MessageItem } from './MessageItem';
import { StreamingMessage } from './StreamingMessage';
import { HugeiconsIcon } from "@hugeicons/react";
import { BotIcon, RefreshIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";

interface ToolUseInfo {
  id: string;
  name: string;
  input: unknown;
}

interface ToolResultInfo {
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

interface MessageListProps {
  sessionId?: string;
  messages: Message[];
  streamingContent: string;
  isStreaming: boolean;
  toolUses?: ToolUseInfo[];
  toolResults?: ToolResultInfo[];
  streamingToolOutput?: string;
  statusText?: string;
  pendingPermission?: PermissionRequestEvent | null;
  onPermissionResponse?: (decision: 'allow' | 'allow_session' | 'deny') => void;
  permissionResolved?: 'allow' | 'deny' | null;
}

const INITIAL_MESSAGE_LIMIT = 20;
const LOAD_MORE_COUNT = 50;

export function MessageList({
  sessionId,
  messages,
  streamingContent,
  isStreaming,
  toolUses = [],
  toolResults = [],
  streamingToolOutput,
  statusText,
  pendingPermission,
  onPermissionResponse,
  permissionResolved,
}: MessageListProps) {
  const [displayedMessages, setDisplayedMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalLoaded, setTotalLoaded] = useState(0);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Initialize displayed messages when session changes
  useEffect(() => {
    // Show most recent messages first
    const recentMessages = messages.slice(-INITIAL_MESSAGE_LIMIT);
    setDisplayedMessages(recentMessages);
    setHasMore(messages.length > INITIAL_MESSAGE_LIMIT);
    setTotalLoaded(messages.length);
  }, [sessionId, messages]);

  const loadMoreMessages = useCallback(async () => {
    if (loadingMore || !sessionId) return;

    setLoadingMore(true);
    try {
      const offset = totalLoaded;
      const res = await fetch(`/api/chat/sessions/${sessionId}/messages?offset=${offset}&limit=${LOAD_MORE_COUNT}`);
      if (res.ok) {
        const data = await res.json();
        const olderMessages = data.messages;

        // Prepend older messages (they come in reverse order from API)
        setDisplayedMessages((prev) => [
          ...olderMessages.reverse(),
          ...prev,
        ]);

        setHasMore(data.hasMore || false);
        setTotalLoaded((prev) => prev + olderMessages.length);
      }
    } catch {
      // Silent fail on load more
    } finally {
      setLoadingMore(false);
    }
  }, [sessionId, totalLoaded, loadingMore]);

  // Scroll to load more trigger when at top
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMoreMessages();
        }
      },
      { threshold: 1.0 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMoreMessages]);

  // Keep Conversation layout always so reopening never loses structure/styles
  if (displayedMessages.length === 0 && !isStreaming) {
    return (
      <Conversation className="relative flex-1 overflow-y-hidden">
        <ConversationContent className="mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-4 py-6">
          <ConversationEmptyState
            title="Claude Chat"
            description="Start a conversation with Claude. Ask questions, get help with code, or explore ideas."
            icon={
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/20 to-purple-600/20">
                <HugeiconsIcon icon={BotIcon} className="h-8 w-8 text-violet-500" />
              </div>
            }
          />
        </ConversationContent>
      </Conversation>
    );
  }

  return (
    <Conversation>
      <ConversationContent className="mx-auto max-w-3xl px-4 py-6 gap-6">
        {/* Load more trigger at top */}
        {hasMore && (
          <div ref={loadMoreRef} className="flex justify-center py-2">
            {loadingMore ? (
              <HugeiconsIcon icon={RefreshIcon} className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={loadMoreMessages}
                className="text-xs text-muted-foreground"
              >
                Load earlier messages
              </Button>
            )}
          </div>
        )}

        {displayedMessages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}

        {isStreaming && (
          <StreamingMessage
            content={streamingContent}
            isStreaming={isStreaming}
            toolUses={toolUses}
            toolResults={toolResults}
            streamingToolOutput={streamingToolOutput}
            statusText={statusText}
            pendingPermission={pendingPermission}
            onPermissionResponse={onPermissionResponse}
            permissionResolved={permissionResolved}
          />
        )}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
