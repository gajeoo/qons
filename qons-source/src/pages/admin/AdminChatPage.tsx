import { useMutation, useQuery } from "convex/react";
import {
  Bot,
  CheckCircle,
  MessageCircle,
  MessageSquare,
  Send,
  Shield,
  User,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

function formatMessage(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" class="underline text-sky-500">$1</a>',
    )
    .replace(/\n/g, "<br />");
}

export default function AdminChatPage() {
  const conversations = useQuery(api.chat.listConversations) ?? [];
  const chatStats = useQuery(api.chat.getStats);
  const [selectedId, setSelectedId] = useState<Id<"chatConversations"> | null>(
    null,
  );
  const [replyInput, setReplyInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = useQuery(
    api.chat.getConversationMessages,
    selectedId ? { conversationId: selectedId } : "skip",
  );
  const sendReply = useMutation(api.chat.sendAdminReply);
  const closeConv = useMutation(api.chat.closeConversation);
  const markRead = useMutation(api.chat.markAsRead);

  // Mark as read when selecting a conversation
  useEffect(() => {
    if (selectedId) {
      markRead({ conversationId: selectedId });
    }
  }, [selectedId, markRead]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleSendReply = async () => {
    const text = replyInput.trim();
    if (!text || !selectedId) return;
    setReplyInput("");
    await sendReply({ conversationId: selectedId, content: text });
  };

  const selectedConversation = conversations.find(c => c._id === selectedId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Chat Management</h1>
        <p className="text-muted-foreground">
          View and reply to customer conversations
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-sky-100 dark:bg-sky-500/10 flex items-center justify-center">
                <MessageSquare className="size-5 text-sky-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {chatStats?.totalConversations ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Total Chats</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
                <MessageCircle className="size-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {chatStats?.activeConversations ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center">
                <User className="size-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {chatStats?.waitingForAdmin ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Waiting</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-red-100 dark:bg-red-500/10 flex items-center justify-center">
                <MessageSquare className="size-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {chatStats?.totalUnread ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Unread</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chat interface */}
      <div className="grid md:grid-cols-[360px_1fr] gap-4 h-[600px]">
        {/* Conversation list */}
        <Card className="overflow-hidden flex flex-col">
          <CardHeader className="py-3 px-4 border-b shrink-0">
            <CardTitle className="text-sm font-medium">Conversations</CardTitle>
          </CardHeader>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm p-4">
                <MessageCircle className="size-8 mb-2 opacity-50" />
                <p>No conversations yet</p>
                <p className="text-xs">
                  Chats from the widget will appear here
                </p>
              </div>
            ) : (
              conversations.map(conv => (
                <button
                  key={conv._id}
                  onClick={() => setSelectedId(conv._id)}
                  className={`w-full text-left px-4 py-3 border-b hover:bg-muted/50 transition-colors ${
                    selectedId === conv._id ? "bg-muted" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="size-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate">
                          {conv.visitorName ||
                            conv.visitorEmail ||
                            `Visitor ${conv.visitorId.slice(-6)}`}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {formatTime(conv.lastMessageAt)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {conv.lastMessage || "No messages"}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant={
                            conv.status === "active"
                              ? "default"
                              : conv.status === "waiting_admin"
                                ? "destructive"
                                : "secondary"
                          }
                          className="text-[9px] h-4 px-1.5"
                        >
                          {conv.status === "waiting_admin"
                            ? "Needs Reply"
                            : conv.status}
                        </Badge>
                        {conv.unreadByAdmin > 0 && (
                          <span className="size-5 rounded-full bg-sky-500 text-white text-[10px] flex items-center justify-center font-medium">
                            {conv.unreadByAdmin}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        {/* Message view */}
        <Card className="overflow-hidden flex flex-col">
          {selectedId && selectedConversation ? (
            <>
              {/* Conv header */}
              <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                    <User className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {selectedConversation.visitorName ||
                        `Visitor ${selectedConversation.visitorId.slice(-6)}`}
                    </p>
                    {selectedConversation.visitorEmail && (
                      <p className="text-xs text-muted-foreground">
                        {selectedConversation.visitorEmail}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedConversation.status !== "closed" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => closeConv({ conversationId: selectedId })}
                      className="text-xs"
                    >
                      <XCircle className="size-3 mr-1" /> Close
                    </Button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages?.map(msg => (
                  <div
                    key={msg._id}
                    className={`flex ${msg.role === "visitor" ? "justify-end" : "justify-start"}`}
                  >
                    <div className="flex flex-col max-w-[80%]">
                      <div className="flex items-center gap-1.5 mb-1 text-[10px] text-muted-foreground">
                        {msg.role === "visitor" ? (
                          <User className="size-3" />
                        ) : msg.role === "admin" ? (
                          <Shield className="size-3" />
                        ) : (
                          <Bot className="size-3" />
                        )}
                        <span>
                          {msg.role === "visitor"
                            ? "Visitor"
                            : msg.role === "admin"
                              ? msg.senderName || "Admin"
                              : "AI"}
                        </span>
                        <span>• {formatTime(msg._creationTime)}</span>
                      </div>
                      <div
                        className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                          msg.role === "visitor"
                            ? "bg-sky-500 text-white rounded-br-md"
                            : msg.role === "admin"
                              ? "bg-emerald-500/10 border border-emerald-500/30 rounded-bl-md"
                              : "bg-muted rounded-bl-md"
                        }`}
                        dangerouslySetInnerHTML={{
                          __html: formatMessage(msg.content),
                        }}
                      />
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply input */}
              {selectedConversation.status !== "closed" && (
                <div className="p-3 border-t">
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      handleSendReply();
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      value={replyInput}
                      onChange={e => setReplyInput(e.target.value)}
                      placeholder="Type your reply..."
                      className="flex-1 rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={!replyInput.trim()}
                      className="rounded-xl bg-sky-500 hover:bg-sky-600"
                    >
                      <Send className="size-4" />
                    </Button>
                  </form>
                </div>
              )}
              {selectedConversation.status === "closed" && (
                <div className="p-3 border-t bg-muted/50 text-center">
                  <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
                    <CheckCircle className="size-4" /> This conversation is
                    closed
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageSquare className="size-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">Select a conversation</p>
              <p className="text-xs mt-1">
                Choose from the list to view messages and reply
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
