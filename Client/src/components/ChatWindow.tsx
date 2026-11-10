import { useEffect, useRef, useState } from "react";
import type { Member } from "../data/members";
import {
  getDirectMessageHistory,
  sendDirectMessage,
  type DirectTextMessage
} from "../services/directChat";

type ChatWindowProps = {
  member: Member;
  currentUserId: string;
  cachedMessages: DirectTextMessage[];
  onClose: () => void;
  onMessageSent?: (message: DirectTextMessage) => void;
};

function mergeMessages(
  ...groups: DirectTextMessage[][]
): DirectTextMessage[] {
  const uniqueMessages = new Map<string, DirectTextMessage>();

  groups.forEach((group) => {
    group.forEach((message) => {
      uniqueMessages.set(message.messageId, message);
    });
  });

  return Array.from(uniqueMessages.values()).sort(
    (a, b) => a.sentTime - b.sentTime
  );
}

function ChatWindow({
  member,
  currentUserId,
  cachedMessages,
  onClose,
  onMessageSent
}: ChatWindowProps) {
  const [messages, setMessages] = useState<DirectTextMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addMessage = (message: DirectTextMessage) => {
    setMessages((current) =>
      mergeMessages(current, [message])
    );
  };

  // Load cached messages and fetch server history.
  useEffect(() => {
    let active = true;

    setMessages(cachedMessages);
    setLoading(true);
    setError("");

    getDirectMessageHistory(member.chatUserId)
      .then((history) => {
        if (active) {
          setMessages((current) =>
            mergeMessages(current, history, cachedMessages)
          );
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load conversation."
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const handleIncomingMessage = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      const incoming = Array.isArray(detail) ? detail : [detail];

      incoming.forEach((raw) => {
        if (!raw || typeof raw !== "object") return;

        const message = raw as {
          messageId?: string;
          senderUserId?: string;
          sentTime?: number;
          messageType?: string;
          content?: { text?: string };
        };

        if (
          message.senderUserId !== member.chatUserId ||
          message.messageType !== "RC:TxtMsg" ||
          !message.messageId ||
          typeof message.content?.text !== "string"
        ) {
          return;
        }

        addMessage({
          messageId: message.messageId,
          senderUserId: message.senderUserId,
          sentTime: message.sentTime ?? Date.now(),
          text: message.content.text
        });
      });
    };

    window.addEventListener(
      "campuswide:nexconn-message",
      handleIncomingMessage
    );

    return () => {
      active = false;

      window.removeEventListener(
        "campuswide:nexconn-message",
        handleIncomingMessage
      );
    };
  }, [member.chatUserId]);

  // Merge any cached messages that arrive while this chat is mounted.
  useEffect(() => {
    if (cachedMessages.length === 0) return;

    setMessages((current) =>
      mergeMessages(current, cachedMessages)
    );
  }, [cachedMessages]);

  // Keep the latest message visible.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const text = draft.trim();

    if (!text || sending) return;

    setSending(true);
    setError("");

    try {
      const sentMessage = await sendDirectMessage(
        member.chatUserId,
        text
      );

            addMessage(sentMessage);
      onMessageSent?.(sentMessage);
      setDraft("");
      inputRef.current?.focus();

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Message could not be sent."
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="chat-window">
      <header className="chat-header">
        <div className="chat-person">
          <div className="chat-avatar">{member.initials}</div>

          <div>
            <strong>{member.name}</strong>
            <span>{member.division} · {member.role}</span>
          </div>
        </div>

        <button
          className="chat-close"
          onClick={onClose}
          type="button"
        >
          ✕
        </button>
      </header>

      <div className="chat-messages">
        {loading && messages.length === 0 ? (
          <p className="chat-status">Loading conversation...</p>
        ) : messages.length === 0 ? (
          <p className="chat-status">
            No messages yet. Start the conversation!
          </p>
        ) : (
          messages.map((message) => {
            const isMine = message.senderUserId === currentUserId;

            return (
              <div
                key={message.messageId}
                className={`chat-message-row ${isMine ? "mine" : "theirs"}`}
              >
                <div className="chat-message">
                  <p>{message.text}</p>

                  <time>
                    {new Date(message.sentTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </time>
                </div>
              </div>
            );
          })
        )}

        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="chat-error">{error}</p>
      )}

      <form className="chat-compose" onSubmit={handleSend}>
        <input
        ref={inputRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={`Message ${member.name}...`}
        maxLength={5000}
        />

        <button
      type="submit"
       onMouseDown={(event) => event.preventDefault()}
       disabled={!draft.trim() || sending}
      >   
       {sending ? "Sending..." : "Send"}
        </button>
      </form>
    </section>
  );
}

export default ChatWindow;