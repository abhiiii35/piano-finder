"use client";

import { useEffect, useRef, useState } from "react";
import { sendMessage, getMessages } from "@/actions/messages";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { Send } from "lucide-react";

type Message = {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  isRead: boolean;
};

type Props = {
  threadId: string;
  bookingId?: string;
  technicianId: string;
  currentUserId: string;
};

export function MessageThread({ threadId, bookingId, technicianId, currentUserId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Initial load
  useEffect(() => {
    getMessages(threadId).then((result) => {
      if (result.messages) {
        setMessages(result.messages);
        setLoaded(true);
      }
    });
  }, [threadId]);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    if (!loaded) return;

    const interval = setInterval(async () => {
      const lastCreatedAt = messages.length > 0
        ? messages[messages.length - 1].createdAt
        : null;

      const url = lastCreatedAt
        ? `/api/messages/${encodeURIComponent(threadId)}?since=${encodeURIComponent(lastCreatedAt)}`
        : `/api/messages/${encodeURIComponent(threadId)}`;

      try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newMsgs = data.messages.filter((m: Message) => !existingIds.has(m.id));
            return newMsgs.length > 0 ? [...prev, ...newMsgs] : prev;
          });
        }
      } catch {
        // Silently ignore polling errors
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [threadId, loaded, messages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!newMessage.trim()) return;
    setSending(true);

    const result = await sendMessage({
      threadId,
      content: newMessage.trim(),
      bookingId,
      technicianId,
    });

    setSending(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      setNewMessage("");
      // Optimistically add the message
      setMessages((prev) => [
        ...prev,
        {
          id: result.messageId!,
          senderId: currentUserId,
          senderName: "You",
          content: newMessage.trim(),
          createdAt: new Date().toISOString(),
          isRead: false,
        },
      ]);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col">
      {/* Messages */}
      <div className="space-y-3 max-h-96 overflow-y-auto p-1">
        {messages.length === 0 && loaded && (
          <p className="text-center text-sm text-muted-foreground py-8">
            No messages yet. Start the conversation!
          </p>
        )}
        {messages.map((msg) => {
          const isOwn = msg.senderId === currentUserId;
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}
            >
              <div
                className={`rounded-lg px-3 py-2 max-w-[80%] ${
                  isOwn
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="text-sm whitespace-pre-line">{msg.content}</p>
              </div>
              <span className="mt-1 text-xs text-muted-foreground">
                {isOwn ? "You" : msg.senderName} &middot;{" "}
                {format(new Date(msg.createdAt), "MMM d, h:mm a")}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-4 flex gap-2">
        <Textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          className="min-h-[40px] resize-none"
        />
        <Button
          onClick={handleSend}
          disabled={sending || !newMessage.trim()}
          size="icon"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
