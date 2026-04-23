import { useAction, useMutation, useQuery } from "convex/react";
import {
  Bot,
  Maximize2,
  Minimize2,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "../../convex/_generated/api";

const QUICK_ACTIONS = [
  { label: "📊 Dashboard Summary", prompt: "Give me a summary of everything" },
  { label: "📋 My Tasks", prompt: "Show my tasks" },
  { label: "📅 Today's Schedule", prompt: "Show today's schedule" },
  { label: "🏢 My Properties", prompt: "Show my properties" },
  { label: "👥 My Team", prompt: "Show my team" },
  { label: "🏠 Residents", prompt: "Show my residents" },
  { label: "⚡ Automations", prompt: "Show my automations" },
  { label: "➕ Create Task", prompt: "Create a task called " },
];

function formatResponse(text: string): string {
  return text
    .replace(/\*([^*]+)\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br />");
}

export function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const messages = useQuery(api.aiAssistant.getConversation) || [];
  const sendMessage = useAction(api.aiAssistant.sendMessageLLM);
  const clearConversation = useMutation(api.aiAssistant.clearConversation);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = async (text?: string) => {
    const message = text || input.trim();
    if (!message || isLoading) return;

    setInput("");
    setIsLoading(true);

    try {
      await sendMessage({ content: message });
    } catch {
      // Error handled silently; message won't appear
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleClear = async () => {
    await clearConversation();
  };

  const handleQuickAction = (prompt: string) => {
    if (prompt.endsWith(" ")) {
      setInput(prompt);
      inputRef.current?.focus();
    } else {
      handleSend(prompt);
    }
  };

  // Collapsed FAB button
  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-3 text-white shadow-xl hover:shadow-2xl transition-all hover:scale-105 group"
      >
        <Sparkles className="size-5 group-hover:animate-pulse" />
        <span className="font-semibold text-sm">AI Assistant</span>
      </button>
    );
  }

  const panelSize = isExpanded
    ? "fixed inset-4 z-50"
    : "fixed bottom-6 right-6 z-50 w-[420px] h-[600px]";

  return (
    <div
      className={`${panelSize} flex flex-col rounded-2xl border border-border/50 bg-background shadow-2xl overflow-hidden`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bot className="size-6" />
            <span className="absolute -bottom-0.5 -right-0.5 block size-2.5 rounded-full bg-green-400 ring-2 ring-white" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Qons AI Assistant</h3>
            <p className="text-xs text-blue-100">
              Your personal property manager
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
            title="Clear conversation"
          >
            <Trash2 className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
            title={isExpanded ? "Minimize" : "Maximize"}
          >
            {isExpanded ? (
              <Minimize2 className="size-4" />
            ) : (
              <Maximize2 className="size-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setIsExpanded(false);
            }}
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center size-16 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 mb-4">
              <Sparkles className="size-8 text-blue-600" />
            </div>
            <h3 className="font-semibold text-lg mb-1">How can I help?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              I can manage tasks, check schedules, view properties, and more.
            </p>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-2 text-left">
              {QUICK_ACTIONS.map(action => (
                <button
                  type="button"
                  key={action.label}
                  onClick={() => handleQuickAction(action.prompt)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all text-sm group"
                >
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg: any) => (
          <div
            key={msg._id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-br-md"
                  : "bg-muted rounded-bl-md"
              }`}
            >
              {msg.role === "assistant" ? (
                <div
                  className="prose prose-sm dark:prose-invert max-w-none [&>br]:my-0.5"
                  dangerouslySetInnerHTML={{
                    __html: formatResponse(msg.content),
                  }}
                />
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1.5">
                <span className="size-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                <span className="size-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                <span className="size-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions Bar (when conversation is active) */}
      {messages.length > 0 && (
        <div className="px-3 pb-1 shrink-0">
          <div className="flex gap-1 overflow-x-auto py-1 scrollbar-hide">
            {[
              { label: "📊 Summary", prompt: "Give me a summary" },
              { label: "📋 Tasks", prompt: "Show my tasks" },
              { label: "➕ New Task", prompt: "Create a task called " },
              { label: "❓ Help", prompt: "What can you do?" },
            ].map(a => (
              <button
                type="button"
                key={a.label}
                onClick={() => handleQuickAction(a.prompt)}
                className="shrink-0 px-2.5 py-1 rounded-full bg-muted hover:bg-muted/80 text-xs font-medium transition-colors"
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t shrink-0">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask anything or give a command..."
            className="flex-1 rounded-xl border border-border bg-muted/50 px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            className="shrink-0 rounded-xl bg-blue-600 hover:bg-blue-700"
            disabled={!input.trim() || isLoading}
          >
            <Send className="size-4" />
          </Button>
        </form>
        <p className="text-[10px] text-muted-foreground text-center mt-1.5">
          Qons AI · Your intelligent property management assistant
        </p>
      </div>
    </div>
  );
}
