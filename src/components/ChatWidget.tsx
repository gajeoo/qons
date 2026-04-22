import { useMutation, useQuery } from "convex/react";
import { Bot, MessageCircle, Send, User, X, Shield } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

function getVisitorId(): string {
  const KEY = "quonsapp_visitor_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = `visitor_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}

function formatMessage(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="underline text-sky-400 hover:text-sky-300">$1</a>')
    .replace(/\n/g, "<br />");
}

type ChatWidgetProps = {
  source?: "widget" | "dashboard";
  layout?: "floating" | "embedded";
  title?: string;
  subtitle?: string;
  toggleLabel?: string;
  inputPlaceholder?: string;
  suggestedPrompts?: string[];
  visitorId?: string;
  visitorName?: string;
  visitorEmail?: string;
  metadata?: string;
};

export function ChatWidget({
  source = "widget",
  layout = "floating",
  title = "QuonsApp Assistant",
  subtitle = "Online — here to help",
  toggleLabel = "Chat with us",
  inputPlaceholder = "Type your message...",
  suggestedPrompts = [],
  visitorId,
  visitorName,
  visitorEmail,
  metadata,
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<Id<"chatConversations"> | null>(null);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const resolvedVisitorId = visitorId ?? getVisitorId();

  const getOrCreate = useMutation(api.chat.getOrCreateConversation);
  const sendMessage = useMutation(api.chat.sendVisitorMessage);
  const messages = useQuery(
    api.chat.getMessages,
    conversationId ? { conversationId } : "skip",
  );
  const shouldShowPanel = layout === "embedded" || isOpen;

  // Create conversation when widget opens
  useEffect(() => {
    if (shouldShowPanel && !conversationId) {
      getOrCreate({
        visitorId: resolvedVisitorId,
        visitorName,
        visitorEmail,
        source,
        metadata,
      }).then(setConversationId);
    }
  }, [shouldShowPanel, conversationId, getOrCreate, metadata, resolvedVisitorId, source, visitorEmail, visitorName]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (shouldShowPanel) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [shouldShowPanel]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !conversationId || isSending) return;

    setInput("");
    setIsSending(true);

    try {
      await sendMessage({ conversationId, content: text, visitorName, visitorEmail });
    } catch (e) {
      console.error("Failed to send message:", e);
    } finally {
      setIsSending(false);
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "visitor": return <User className="size-3" />;
      case "admin": return <Shield className="size-3" />;
      default: return <Bot className="size-3" />;
    }
  };

  const getRoleBubbleStyle = (role: string) => {
    switch (role) {
      case "visitor": return "bg-sky-500 text-white rounded-br-md";
      case "admin": return "bg-emerald-500/10 text-foreground border border-emerald-500/30 rounded-bl-md";
      default: return "bg-muted text-foreground rounded-bl-md";
    }
  };

  const panel = (
    <div className={layout === "floating"
      ? "fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-48px)] h-[560px] max-h-[calc(100vh-100px)] bg-background border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      : "w-full h-[560px] rounded-2xl border bg-background shadow-sm flex flex-col overflow-hidden"
    }>
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white">
        <div className="size-9 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
          <Bot className="size-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-white/70 flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-emerald-400 inline-block" />
            {subtitle}
          </p>
        </div>
        {layout === "floating" && (
          <button
            onClick={() => setIsOpen(false)}
            className="size-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {suggestedPrompts.length > 0 && (
        <div className="border-b bg-muted/20 px-3 py-2 flex flex-wrap gap-2">
          {suggestedPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => handleSuggestedPrompt(prompt)}
              className="rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground hover:border-sky-500/30 hover:text-foreground transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages?.map((msg) => (
          <div
            key={msg._id}
            className={`flex ${msg.role === "visitor" ? "justify-end" : "justify-start"}`}
          >
            <div className="flex flex-col max-w-[85%]">
              {msg.role !== "visitor" && (
                <div className="flex items-center gap-1.5 mb-1 text-[10px] text-muted-foreground">
                  {getRoleIcon(msg.role)}
                  <span>{msg.role === "admin" ? (msg.senderName || "Admin") : "AI Assistant"}</span>
                </div>
              )}
              <div
                className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${getRoleBubbleStyle(msg.role)}`}
                dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
              />
            </div>
          </div>
        ))}
        {isSending && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <div className="size-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="size-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="size-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t bg-muted/30">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={inputPlaceholder}
            className="flex-1 rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isSending}
            className="rounded-xl bg-sky-500 hover:bg-sky-600 shrink-0"
          >
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {layout === "floating" && !isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-sky-500 px-5 py-3 text-white shadow-lg shadow-sky-500/25 hover:bg-sky-600 transition-all hover:scale-105 active:scale-95"
        >
          <MessageCircle className="size-5" />
          <span className="text-sm font-medium hidden sm:inline">{toggleLabel}</span>
        </button>
      )}

      {shouldShowPanel && panel}
    </>
  );
}
