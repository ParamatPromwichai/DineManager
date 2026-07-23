'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { Send, User, MessageCircle, Bot, ChevronLeft, Zap, Sparkles, Check, Clock, ChevronDown } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function ShopChatPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const { data: customers, mutate: mutateCustomers } = useSWR(
    status === 'authenticated' ? '/api/shop/chat' : null,
    fetcher,
    { refreshInterval: 5000 }
  );

  const [activeUser, setActiveUser] = useState<{ user_id: string; name: string; email: string } | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const isSendingRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const getUnreadCount = (userId: string, totalMsgs: number, lastSender: string) => {
    if (typeof window === 'undefined') return 0;
    
    if (activeUser?.user_id === userId) {
      localStorage.setItem(`shop_read_total_msgs_${userId}`, totalMsgs.toString());
      return 0;
    }
    
    // ถ้าฝั่งร้านค้าเป็นคนพิมพ์ล่าสุด ถือว่าอ่าน/ตอบแล้ว
    if (lastSender === 'shop') return 0;
    
    const readTotalStr = localStorage.getItem(`shop_read_total_msgs_${userId}`);
    
    if (!readTotalStr) {
      if (lastSender === 'shop') {
        localStorage.setItem(`shop_read_total_msgs_${userId}`, totalMsgs.toString());
        return 0;
      } else {
        localStorage.setItem(`shop_read_total_msgs_${userId}`, (totalMsgs - 1).toString());
        return 1;
      }
    }
    
    const readTotal = parseInt(readTotalStr);
    const unreadCount = totalMsgs - readTotal;
    
    if (unreadCount < 0) {
      localStorage.setItem(`shop_read_total_msgs_${userId}`, totalMsgs.toString());
      return 0;
    }
    
    return unreadCount;
  };

  // Check auth
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login/shop');
    } else if (status === 'authenticated' && (session?.user as any)?.role !== 'shop') {
      router.replace('/login/shop?error=wrong_role');
    }
  }, [status, session, router]);

  // Fetch active user messages
  const fetchMessages = async (userId: string) => {
    if (isSendingRef.current) return;
    try {
      const res = await fetch(`/api/shop/chat/${userId}`);
      const data = await res.json();
      setMessages(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!activeUser) return;
    fetchMessages(activeUser.user_id);
    const interval = setInterval(() => {
      fetchMessages(activeUser.user_id);
    }, 3000); // Poll every 3 seconds for new messages
    return () => clearInterval(interval);
  }, [activeUser]);

  useEffect(() => {
    // Only auto scroll if we are near the bottom or sending a new message
    if (isSending || !showScrollButton) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isSending]);

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeUser || isSending) return;

    setIsSending(true);
    isSendingRef.current = true;
    const currentInput = input;
    setInput('');

    // Optimistic UI update
    setMessages((prev) => [...prev, { sender: 'shop', text: currentInput }]);

    try {
      await fetch(`/api/shop/chat/${activeUser.user_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: currentInput }),
      });
      // Fetch fresh messages
      fetchMessages(activeUser.user_id);
    } catch (err) {
      console.error(err);
      // Revert optimistic update if needed, but for now just log
    } finally {
      setIsSending(false);
      isSendingRef.current = false;
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-slate-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (status !== 'authenticated' || (session?.user as any)?.role !== 'shop') return null;

  return (
    <div className="bg-slate-50 h-[calc(100dvh-80px)] flex flex-col overflow-hidden font-sans">
      <div className="max-w-[1400px] mx-auto w-full flex-1 flex flex-col lg:flex-row p-0 sm:p-6 lg:gap-6 h-full min-h-0">
        
        {/* Left Panel: Customer List */}
        <div className={`w-full lg:w-80 bg-white lg:border border-slate-200 lg:rounded-3xl lg:shadow-sm flex flex-col overflow-hidden shrink-0 h-full lg:h-auto ${activeUser ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3 shrink-0">
            <button 
              onClick={() => router.push('/dashboard/shop')}
              className="lg:hidden p-2 -ml-2 mr-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-xl transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <MessageCircle size={20} />
            </div>
            <div>
              <h2 className="font-black text-slate-900 text-lg leading-tight">แชทกับลูกค้า</h2>
              <p className="text-xs font-bold text-slate-500">จัดการข้อความสอบถาม</p>
            </div>
          </div>
          
          <div className="overflow-y-auto flex-1 p-3 space-y-2">
            {!customers ? (
              <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>
            ) : customers.length === 0 ? (
              <div className="text-center py-10 text-slate-400 font-medium text-sm">ไม่มีประวัติการแชท</div>
            ) : (
              customers.map((c: any) => {
                const unreadCount = getUnreadCount(c.user_id, c.total_msgs, c.last_sender);
                return (
                  <button
                    key={c.user_id}
                    onClick={() => setActiveUser(c)}
                    className={`w-full text-left p-3 rounded-2xl transition-all flex items-center gap-3 ${activeUser?.user_id === c.user_id ? 'bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-500/20' : 'bg-white hover:bg-slate-50 border-transparent hover:border-slate-200'}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${activeUser?.user_id === c.user_id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <User size={18} />
                    </div>
                    <div className="overflow-hidden flex-1">
                      <div className={`font-bold text-sm truncate ${unreadCount > 0 ? 'text-blue-700' : 'text-slate-900'}`}>{c.name || 'ลูกค้าทั่วไป'}</div>
                      <div className="text-xs text-slate-500 truncate">{c.email || 'ไม่มีอีเมล'}</div>
                    </div>
                    {unreadCount > 0 && (
                      <div className="flex items-center justify-center h-[20px] min-w-[20px] px-1.5 rounded-full bg-blue-600 text-white text-[10px] font-bold shrink-0 shadow-[0_2px_8px_rgba(37,99,235,0.4)]">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Chat Window */}
        <div className={`flex-1 relative bg-white lg:border border-slate-200 lg:rounded-3xl lg:shadow-sm flex flex-col overflow-hidden h-full ${!activeUser ? 'hidden lg:flex' : 'flex'}`}>
          {!activeUser ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <MessageCircle size={32} className="text-slate-300" />
              </div>
              <p className="font-bold">เลือกลูกค้าทางซ้ายเพื่อเริ่มสนทนา</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 bg-white flex items-center gap-3 shadow-sm z-10 shrink-0">
                <button 
                  onClick={() => setActiveUser(null)}
                  className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  <ChevronLeft size={24} />
                </button>
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 border border-slate-200">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base leading-tight">{activeUser.name || 'ลูกค้าทั่วไป'}</h3>
                  <p className="text-xs font-semibold text-emerald-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> กำลังสนทนา
                  </p>
                </div>
              </div>

              {/* Chat Messages */}
              <div 
                ref={chatContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F8FAFC] space-y-4 relative"
              >
                {messages.length === 0 ? (
                  <div className="text-center text-slate-400 py-10 font-medium text-sm">ยังไม่มีข้อความ</div>
                ) : (
                  messages.map((msg, i) => {
                    const isShop = msg.sender === 'shop';
                    const isBot = msg.sender === 'bot';
                    const isUser = msg.sender === 'user';
                    const isOurSide = isShop || isBot;
                    const isLastMessage = i === messages.length - 1;
                    const isCurrentlySending = isShop && isLastMessage && isSending;

                    let cleanText = msg.text || "";
                    let isGroq = false;
                    let isGemini = false;
                    
                    if (cleanText.includes("*(ตอบโดย Groq AI ⚡)*")) {
                      isGroq = true;
                      cleanText = cleanText.replace(/\n\n\*\((ตอบโดย Groq AI ⚡)\)\*/g, "").replace(/\*\((ตอบโดย Groq AI ⚡)\)\*/g, "").trim();
                    } else if (cleanText.includes("*(ตอบโดย Gemini AI ✨)*")) {
                      isGemini = true;
                      cleanText = cleanText.replace(/\n\n\*\((ตอบโดย Gemini AI ✨)\)\*/g, "").replace(/\*\((ตอบโดย Gemini AI ✨)\)\*/g, "").trim();
                    } else if (cleanText.includes("*(ตอบโดย Auto-Bot 🤖)*") || cleanText.includes("*(ตอบโดย Auto Bot 🤖)*")) {
                      cleanText = cleanText.replace(/\n\n\*\((ตอบโดย Auto-Bot 🤖|ตอบโดย Auto Bot 🤖)\)\*/g, "").replace(/\*\((ตอบโดย Auto-Bot 🤖|ตอบโดย Auto Bot 🤖)\)\*/g, "").trim();
                    }
                    
                    return (
                      <div key={i} className={`flex flex-col ${isOurSide ? 'items-end' : 'items-start'}`}>
                        {/* Sender Label */}
                        <div className={`text-[10px] font-bold mb-1 flex items-center gap-1 px-1 ${
                          isShop ? 'text-blue-600' : 
                          isGroq ? 'text-fuchsia-600' : 
                          isGemini ? 'text-amber-600' :
                          isBot ? 'text-blue-500' : 
                          'text-slate-500'
                        }`}>
                          {isShop && <span>ร้าน DineManager (คุณ)</span>}
                          {!isShop && !isBot && <span>ลูกค้า</span>}
                          {isBot && (
                            <>
                              {isGroq ? <Zap size={10} /> : isGemini ? <Sparkles size={10} /> : <Bot size={10} />}
                              <span>{isGroq ? "Groq AI" : isGemini ? "Gemini AI" : "Auto Bot"}</span>
                            </>
                          )}
                        </div>
                        
                        {/* Message Bubble */}
                        <div className={`max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-2xl text-sm font-medium shadow-sm border ${
                          isShop 
                            ? 'bg-blue-600 text-white rounded-tr-sm border-blue-700' 
                            : isGroq
                            ? 'bg-gradient-to-br from-fuchsia-50 to-purple-100 text-purple-900 rounded-tr-sm border-purple-200'
                            : isGemini
                            ? 'bg-gradient-to-br from-amber-50 to-yellow-100 text-amber-900 rounded-tr-sm border-yellow-200'
                            : isBot
                            ? 'bg-blue-50 text-blue-900 rounded-tr-sm border-blue-100'
                            : 'bg-white text-slate-800 rounded-tl-sm border-slate-200'
                        }`}>
                          <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{cleanText}</span>
                        </div>
                        {isShop && (
                          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 mr-1">
                            {isCurrentlySending ? (
                              <><Clock size={10} /> กำลังส่ง...</>
                            ) : (
                              <><Check size={12} className="text-emerald-500" /> ส่งแล้ว</>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                {isSending && (
                  <div className="flex flex-col items-end">
                     <div className="px-4 py-3 bg-blue-600/50 rounded-2xl rounded-tr-sm flex gap-1">
                       <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce"></span>
                       <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                       <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                     </div>
                  </div>
                )}
                <div ref={messagesEndRef} className="h-[1px]" />
              </div>

              {/* Scroll to bottom button */}
              {showScrollButton && (
                <button
                  onClick={() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                    setShowScrollButton(false);
                  }}
                  className="absolute bottom-[110px] right-6 w-11 h-11 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(37,99,235,0.3)] z-20 hover:scale-110 transition-transform"
                >
                  <ChevronDown size={24} />
                </button>
              )}

              {/* Chat Input */}
              <div className="p-3 sm:p-4 bg-white border-t border-slate-100 shrink-0 pb-[calc(12px+env(safe-area-inset-bottom))]">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
                    placeholder="พิมพ์ตอบกลับลูกค้า..."
                    className="flex-1 bg-slate-50 border border-slate-200 text-slate-900 text-[16px] sm:text-sm rounded-xl px-4 py-3 sm:py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || isSending}
                    className="w-[48px] h-[48px] bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl flex items-center justify-center transition-colors shrink-0 shadow-sm"
                  >
                    <Send size={18} className="ml-1" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
