import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  MessageSquare,
  Users,
  Check,
  CheckCheck,
  MapPin,
  Clock,
  Sparkles,
  ArrowLeftRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Connection, Message, User } from '../types';

interface MessagesPageProps {
  initialUserId?: string | null;
  onExplore: () => void;
  onViewProfile: (userId: string) => void;
}

export const MessagesPage: React.FC<MessagesPageProps> = ({
  initialUserId,
  onExplore,
  onViewProfile,
}) => {
  const { currentUser } = useAuth();

  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(initialUserId || null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load active accepted connections
  useEffect(() => {
    let isMounted = true;
    setIsLoadingList(true);

    api.getConnections()
      .then((data) => {
        if (!isMounted) return;
        const accepted = data.accepted || [];
        setConnections(accepted);

        if (!selectedUserId && accepted.length > 0) {
          const first = accepted[0];
          const partnerId = first.senderId === currentUser?.id ? first.receiverId : first.senderId;
          setSelectedUserId(partnerId);
        }
      })
      .catch((err) => console.error('Failed to load connections:', err))
      .finally(() => {
        if (isMounted) setIsLoadingList(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  // Load chat messages when selectedUserId changes
  useEffect(() => {
    if (!selectedUserId) {
      setMessages([]);
      setSelectedUser(null);
      return;
    }

    let isMounted = true;
    setIsLoadingMessages(true);

    api.getMessages(selectedUserId)
      .then((data) => {
        if (!isMounted) return;
        setMessages(data.messages || []);
        setSelectedUser(data.targetUser || null);
        setTimeout(scrollToBottom, 50);
      })
      .catch((err) => {
        console.error('Failed to load messages:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingMessages(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedUserId]);

  // Poll for new messages every 4 seconds when in active chat
  useEffect(() => {
    if (!selectedUserId) return;
    const interval = setInterval(() => {
      api.getMessages(selectedUserId)
        .then((data) => {
          setMessages(data.messages || []);
        })
        .catch(() => {});
    }, 4000);

    return () => clearInterval(interval);
  }, [selectedUserId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedUserId || isSending) return;

    const textToSend = messageText.trim();
    setMessageText('');
    setIsSending(true);

    try {
      const newMsg = await api.sendMessage(selectedUserId, textToSend);
      setMessages((prev) => [...prev, newMsg]);
      setTimeout(scrollToBottom, 50);
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
      setMessageText(textToSend);
    } finally {
      setIsSending(false);
    }
  };

  const safeConnections = Array.isArray(connections) ? connections : [];
  const safeMessages = Array.isArray(messages) ? messages : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-[calc(100vh-140px)] min-h-[550px] flex">
        {/* Left Sidebar: Connections List */}
        <div className="w-80 sm:w-96 border-r border-slate-200 flex flex-col shrink-0 bg-slate-50/50">
          <div className="p-4 border-b border-slate-200 bg-white">
            <h2 className="text-base font-bold text-slate-900">Exchange Chats</h2>
            <p className="text-xs text-slate-500">Connected peers for knowledge exchange</p>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {isLoadingList ? (
              <div className="py-12 text-center">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-400">Loading peers...</p>
              </div>
            ) : safeConnections.length === 0 ? (
              <div className="p-6 text-center text-slate-500">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">No active connections</p>
                <p className="text-[11px] text-slate-400 mt-1 mb-4">
                  You can only chat with peers who have accepted your connection request.
                </p>
                <button
                  onClick={onExplore}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg"
                >
                  Find Skill Swaps
                </button>
              </div>
            ) : (
              safeConnections.map((conn) => {
                const isSender = conn.senderId === currentUser?.id;
                const partnerId = isSender ? conn.receiverId : conn.senderId;
                const partnerName = isSender ? conn.receiverName : conn.senderName;
                const partnerUsername = isSender ? conn.receiverUsername : conn.senderUsername;
                const partnerImage = isSender ? conn.receiverProfileImage : conn.senderProfileImage;
                const isSelected = selectedUserId === partnerId;

                return (
                  <button
                    key={conn.id}
                    onClick={() => setSelectedUserId(partnerId)}
                    className={`w-full text-left p-3.5 transition-colors flex items-center gap-3 ${
                      isSelected
                        ? 'bg-white border-l-4 border-indigo-600 shadow-xs'
                        : 'hover:bg-slate-100/70'
                    }`}
                  >
                    <img
                      src={partnerImage}
                      alt={partnerName}
                      className="w-11 h-11 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>
                          {partnerName}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(conn.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        @{partnerUsername}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Chat Panel */}
        <div className="flex-1 flex flex-col bg-white">
          {selectedUser ? (
            <>
              {/* Chat Header */}
              <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
                <div
                  onClick={() => onViewProfile(selectedUser.id)}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <img
                    src={selectedUser.profileImage}
                    alt={selectedUser.name}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100 group-hover:ring-indigo-300 transition-all"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {selectedUser.name}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span>@{selectedUser.username}</span>
                      {selectedUser.location && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-0.5">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {selectedUser.location}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onViewProfile(selectedUser.id)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  View Profile
                </button>
              </div>

              {/* Chat Messages Stream */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/40">
                {/* Coordination Tip Card */}
                <div className="max-w-md mx-auto p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-center text-xs text-indigo-900">
                  <span className="font-semibold block mb-0.5">Skill Exchange Coordination Chat</span>
                  <span className="text-slate-600 text-[11px]">
                    Agree on your preferred meeting schedule (Zoom, Google Meet, Discord, or in-person) and set mutual learning goals!
                  </span>
                </div>

                {isLoadingMessages ? (
                  <div className="py-12 text-center">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs text-slate-400">Loading conversation history...</p>
                  </div>
                ) : safeMessages.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 text-xs">
                    No messages exchanged yet. Say hello and introduce the skills you would like to swap!
                  </div>
                ) : (
                  safeMessages.map((msg) => {
                    const isMe = msg.senderId === currentUser?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[80%] sm:max-w-md px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-2xs ${
                            isMe
                              ? 'bg-indigo-600 text-white rounded-br-xs'
                              : 'bg-white text-slate-900 border border-slate-200/90 rounded-bl-xs'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.message}</p>
                        </div>

                        <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 px-1">
                          <span>
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {isMe && (
                            <span title={msg.isRead ? 'Read' : 'Delivered'}>
                              {msg.isRead ? (
                                <CheckCheck className="w-3 h-3 text-indigo-500" />
                              ) : (
                                <Check className="w-3 h-3 text-slate-400" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Field */}
              <form onSubmit={handleSendMessage} className="p-3 sm:p-4 border-t border-slate-200 bg-white">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type a message (e.g. 'Hi! When are you free for our first lesson?')..."
                    className="flex-1 px-4 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={!messageText.trim() || isSending}
                    className="px-4 sm:px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    <span>Send</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-800 mb-1">Select a Connection to Chat</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Choose a peer from the left sidebar to discuss learning schedules, lesson plans, and exchange knowledge.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
