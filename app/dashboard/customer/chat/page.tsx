"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react"; // ➕ 1. นำเข้า useSession
import { Send, Trash2, ArrowLeft, Bot, User, Zap, Sparkles, Check, Clock, ChevronDown, MoreVertical, X } from "lucide-react";

export default function ChatPage() {
  const router = useRouter();
  
  // ➕ 2. ดึงข้อมูล session จาก NextAuth แทน localStorage
  const { data: session, status } = useSession();

  const [messages, setMessages] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('chat_messages');
      if (saved) return JSON.parse(saved);
    }
    return [];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('chat_isSending') === 'true';
    }
    return false;
  });
  const isSendingRef = useRef(isSending);
  const [isBotEnabled, setIsBotEnabled] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);


  // ➕ 3. ดึง userId จาก session
  const userId = (session?.user as any)?.id;

  // ➕ 4. เช็คสถานะล็อกอิน ถ้ายังไม่ล็อกอินให้เด้งไปหน้า login
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    // ต้องรอให้ session โหลดเสร็จก่อนและต้องมี userId
    if (status !== "authenticated" || !userId) return;

    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/chat?user_id=${userId}`);
        const data = await res.json();
        
        setMessages((prev) => {
          if (isSendingRef.current && prev.length > 0) {
            const optimisticUserMsg = prev[prev.length - 1];
            if (optimisticUserMsg.sender === "user") {
              const dbUserMessages = data.filter((m: any) => m.sender === "user");
              const localUserMessages = prev.filter((m: any) => m.sender === "user");
              
              if (dbUserMessages.length < localUserMessages.length) {
                // DB ยังไม่มีข้อความล่าสุด (บอทยังคิดไม่เสร็จ) ให้แสดงข้อความที่เพิ่งพิมพ์ไปก่อน
                return [...data, optimisticUserMsg];
              } else {
                // บอทตอบกลับและบันทึกลง DB แล้ว
                setIsSending(false);
                isSendingRef.current = false;
                if (typeof window !== 'undefined') sessionStorage.setItem('chat_isSending', 'false');
                return data;
              }
            }
          }
          return data || [];
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchHistory();
    // Poll for new messages (e.g. from shop)
    const interval = setInterval(fetchHistory, 3000);
    return () => clearInterval(interval);
  }, [status, userId]);

  // บันทึก state เผื่อผู้ใช้เปลี่ยนหน้า
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('chat_messages', JSON.stringify(messages));
      if (userId) {
        const savedKey = `customer_read_chat_length_${userId}`;
        const lastReadLength = parseInt(localStorage.getItem(savedKey) || '0');
        if (messages.length > lastReadLength) {
          localStorage.setItem(savedKey, messages.length.toString());
        }
      }
    }
  }, [messages, userId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('chat_isSending', isSending ? 'true' : 'false');
      isSendingRef.current = isSending;
    }
  }, [isSending]);

  useEffect(() => {
    // Only auto scroll if we are near the bottom or sending a new message
    if (isSending || !showScrollButton) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isSending]);

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  };

  const clearChat = async (isAuto = false) => {
    if (!userId) return;
    
    // ลบ confirm แบบเก่าออกเพราะใช้ sheet แทนแล้ว

    try {
      await fetch(`/api/chat?user_id=${userId}`, { method: "DELETE" });
      setMessages([]);
      if (isAuto) {
        setMessages([{ sender: "bot", text: "ระบบได้ล้างประวัติแชทอัตโนมัติเนื่องจากไม่มีการใช้งานนานเกินไปค่ะ 😊" }]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // นำระบบ auto-clear ออกตามที่ผู้ใช้ต้องการ
  // useEffect(() => {
  //   let timer = setTimeout(() => {
  //     if (messages.length > 0) {
  //       clearChat(true);
  //     }
  //   }, AUTO_CLEAR_TIME);
  //   return () => clearTimeout(timer);
  // }, [messages]);

  const formatMessage = (text: string) => {
    let imgSrc = null;
    let mainText = text;

    const imgMatch = text.match(/\[IMAGE\](.*)$/);
    if (imgMatch) {
      imgSrc = imgMatch[1];
      mainText = text.replace(imgMatch[0], '').trim();
    }

    const regex = /(https?:\/\/[^\s]+|\[ORDER_BUTTON(?::[^\]]+)?\])/g;
    const parts = mainText.split(regex);

    const renderedText = parts.map((part, index) => {
      if (!part) return null;
      
      if (part.match(/^https?:\/\//)) {
        const mapMatch = part.match(/^https?:\/\/maps\.google\.com\/\?q=([\d\.\-]+),([\d\.\-]+)/);
        if (mapMatch) {
          const lat = mapMatch[1];
          const lon = mapMatch[2];
          return (
            <div key={index} className="mt-3 mb-2 rounded-xl overflow-hidden border-2 border-blue-100 dark:border-slate-700 shadow-sm transition-colors">
              <iframe
                width="100%"
                height="220"
                frameBorder="0"
                className="border-0 block"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://maps.google.com/maps?q=${lat},${lon}&hl=th&z=16&output=embed`}
                allowFullScreen
              ></iframe>
            </div>
          );
        }

        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 dark:text-blue-300 underline break-all font-semibold transition-colors hover:text-blue-500 dark:hover:text-blue-400"
          >
            {part}
          </a>
        );
      }
      
      if (part.startsWith("[ORDER_BUTTON")) {
        const match = part.match(/\[ORDER_BUTTON(?::([^\]]+))?\]/);
        const itemName = match && match[1] ? match[1].trim() : "";
        const buttonText = itemName ? `ไปหน้าสั่งอาหาร (${itemName})` : "ไปหน้าสั่งอาหาร (เมนูทั้งหมด)";
        const targetUrl = itemName 
          ? `/dashboard/customer/menus?search=${encodeURIComponent(itemName)}` 
          : `/dashboard/customer/menus`;

        return (
          <button
            key={index}
            onClick={() => router.push(targetUrl)}
            className="block mt-2 py-2 px-4 bg-emerald-500 hover:bg-emerald-600 text-white border-none rounded-full font-bold cursor-pointer shadow-md transition-all hover:scale-[1.02] hover:shadow-lg active:scale-95"
          >
            🛒 {buttonText}
          </button>
        );
      }
      
      return <span key={index} className="whitespace-pre-wrap leading-relaxed">{part}</span>;
    });

    return (
      <div className="flex flex-col gap-2">
        {mainText && <div>{renderedText}</div>}
        {imgSrc && <img src={imgSrc} alt="รูปภาพ" onClick={() => setFullScreenImage(imgSrc)} style={{ width: '100%', maxWidth: '240px', borderRadius: '12px', display: 'block', cursor: 'pointer' }} />}
      </div>
    );
  };

  const deleteMessage = async (id: string) => {
    if (!id || !userId) return;
    try {
      await fetch(`/api/chat?user_id=${userId}&id=${id}`, { method: "DELETE" });
      setMessages((prev) => prev.filter((m) => m.id !== id));
      setSelectedMessage(null);
    } catch (err) {
      console.error("Failed to delete message", err);
    }
  };

  const handleMessageLongPress = (msg: any, isUser: boolean, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (msg.id) {
      setSelectedMessage({ ...msg, isUser });
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !userId || isSending) return;

    setIsSending(true);
    isSendingRef.current = true;
    
    const currentInput = input;
    
    setInput("");

    setMessages((prev) => [...prev, { sender: "user", text: currentInput, created_at: new Date().toISOString() }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: currentInput, user_id: userId, disable_bot: !isBotEnabled }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages((prev) => {
          // แทนที่ข้อความสุดท้ายด้วยข้อความของบอท (หรือเก็บไว้ถ้าจะให้ fetchHistory ดึงมาแทน)
          // เนื่องจาก fetchHistory จะดึงมาอยู่แล้ว เราแค่ set สถานะว่าส่งเสร็จแล้วก็พอ
          return prev;
        });
        // บังคับให้โหลดใหม่ทันที
        const histRes = await fetch(`/api/chat?user_id=${userId}`);
        const histData = await histRes.json();
        setMessages(histData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
      isSendingRef.current = false;
      if (typeof window !== 'undefined') sessionStorage.setItem('chat_isSending', 'false');
    }
  };

  // รวม Loading ของระบบแชทกับ NextAuth เข้าด้วยกัน
  if (status === "loading" || loading) return (
    <div className="flex flex-col justify-center items-center h-screen bg-blue-50 dark:bg-slate-900 gap-4 transition-colors">
      <div className="w-10 h-10 border-4 border-blue-600 dark:border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-blue-900 dark:text-blue-100 font-bold">กำลังโหลดหน้าต่างแชท...</p>
    </div>
  );

  return (
    <div className="fixed top-0 left-0 right-0 bottom-[calc(64px+env(safe-area-inset-bottom))] bg-blue-50 dark:bg-slate-900 flex flex-col z-10 font-sans transition-colors">
      
      <div className="max-w-[600px] mx-auto w-full h-full flex flex-col bg-blue-50 dark:bg-slate-900 relative shadow-sm transition-colors">
        
        {/* 🌟 Header */}
        <div className="flex justify-between items-center py-4 px-5 bg-white dark:bg-slate-800 border-b border-blue-100 dark:border-slate-700 shadow-sm z-10 transition-colors">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-blue-50 dark:bg-slate-700 rounded-full flex items-center justify-center border border-blue-200 dark:border-slate-600 transition-colors">
                <Bot size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="m-0 text-[1.05rem] font-black text-blue-900 dark:text-blue-50">DineManager Bot</h2>
                <div className="flex items-center gap-1 text-[0.75rem] text-emerald-500 font-bold">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div> ออนไลน์
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setIsBotEnabled(!isBotEnabled)}
              className={`p-2 sm:px-3 sm:py-2 flex items-center gap-1.5 text-[0.85rem] font-bold rounded-xl cursor-pointer transition-all ${
                isBotEnabled 
                  ? "bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-slate-600" 
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
              }`}
            >
              {isBotEnabled ? <Bot size={16} /> : <User size={16} />}
              <span className="hidden sm:inline">{isBotEnabled ? "คุยกับบอท" : "คุยกับร้าน"}</span>
            </button>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="p-2 sm:px-3 sm:py-2 flex items-center gap-1.5 text-[0.85rem] font-bold rounded-xl cursor-pointer bg-red-50 dark:bg-red-900/30 text-red-500 border border-red-100 dark:border-red-800 transition-colors hover:bg-red-100 dark:hover:bg-red-900/50"
            >
              <Trash2 size={16} /> <span className="hidden sm:inline">ล้างแชท</span>
            </button>
          </div>
        </div>

        {/* 🌟 Chat History Area */}
        <div 
          ref={chatContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-5 flex flex-col gap-[18px] bg-blue-50 dark:bg-slate-900 transition-colors scrollbar-hide"
        >
          {messages.length === 0 && (
            <div className="text-center my-auto text-slate-500 dark:text-slate-400">
              <div className="w-[60px] h-[60px] bg-blue-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors">
                <Bot size={32} className="text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="m-0 mb-2 text-blue-900 dark:text-blue-100 font-bold">ยินดีต้อนรับสู่ DineManager</h3>
              <p className="text-[0.9rem] m-0">พิมพ์สอบถามเมนู หรือข้อมูลร้านได้เลยครับ 👋</p>
            </div>
          )}

          {messages.map((msg, i) => {
            const currentMsgDate = msg.created_at ? new Date(msg.created_at).toDateString() : null;
            const prevMsgDate = i > 0 && messages[i-1].created_at ? new Date(messages[i-1].created_at).toDateString() : null;
            const showDateDivider = currentMsgDate && currentMsgDate !== prevMsgDate;

            const formatDateDivider = (dateStr: string) => {
              const date = new Date(dateStr);
              const today = new Date();
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              
              if (date.toDateString() === today.toDateString()) return "ส่งวันนี้";
              if (date.toDateString() === yesterday.toDateString()) return "เมื่อวาน";
              
              return `วันที่ ${date.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })}`;
            };

            const isUser = msg.sender === "user";
            const isShop = msg.sender === "shop";
            const isBot = !isUser && !isShop;
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

            const isLastMessage = i === messages.length - 1;
            const isCurrentlySending = isUser && isLastMessage && isSending;

            return (
              <div key={i} className="flex flex-col">
                {showDateDivider && msg.created_at && (
                  <div className="flex justify-center my-3">
                    <span className="text-[0.75rem] bg-blue-100/50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 px-3 py-1 rounded-full font-semibold shadow-sm transition-colors">
                      {formatDateDivider(msg.created_at)}
                    </span>
                  </div>
                )}
                <div className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
                {!isUser && (
                  <div className="flex flex-col items-center gap-1 shrink-0 mb-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors ${
                      isShop ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400' 
                      : isGroq ? 'bg-fuchsia-50 dark:bg-fuchsia-900/30 border-fuchsia-200 dark:border-fuchsia-800 text-fuchsia-500' 
                      : isGemini ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-500' 
                      : 'bg-white dark:bg-slate-700 border-blue-100 dark:border-slate-600 text-blue-600 dark:text-blue-400'
                    }`}>
                      {isShop ? <User size={16} /> : isGroq ? <Zap size={16} /> : (isGemini ? <Sparkles size={16} /> : <Bot size={16} />)}
                    </div>
                    <span className={`text-[0.65rem] font-bold ${
                      isShop ? "text-blue-600 dark:text-blue-400" 
                      : isGroq ? "text-fuchsia-500" 
                      : isGemini ? "text-amber-500" 
                      : "text-blue-600 dark:text-blue-400"
                    }`}>
                      {isShop ? "ร้านค้าตอบ" : isGroq ? "Groq" : (isGemini ? "Gemini" : "Auto Bot")}
                    </span>
                  </div>
                )}
                <div className={`flex flex-col max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
                  <div 
                    onContextMenu={(e) => handleMessageLongPress(msg, isUser, e)}
                    className={`text-[0.95rem] font-medium break-words transition-colors shadow-sm ${
                      isUser 
                        ? "bg-gradient-to-br from-blue-700 to-blue-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.2)] border-none" 
                        : isShop 
                          ? "bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-800" 
                          : isGroq 
                            ? "bg-gradient-to-br from-fuchsia-50 to-purple-50 dark:from-fuchsia-900/20 dark:to-purple-900/20 text-purple-900 dark:text-purple-100 border border-purple-200 dark:border-purple-800" 
                            : isGemini 
                              ? "bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 text-yellow-900 dark:text-yellow-100 border border-yellow-200 dark:border-yellow-800" 
                              : "bg-white dark:bg-slate-800 text-blue-900 dark:text-blue-50 border border-blue-100 dark:border-slate-700"
                    } ${cleanText.startsWith('[IMAGE]') ? 'p-1.5' : 'py-3 px-4'} ${
                      isUser ? 'rounded-[20px_20px_4px_20px]' : 'rounded-[20px_20px_20px_4px]'
                    } ${msg.id ? 'cursor-pointer' : 'cursor-default'} select-none`}
                  >
                    {formatMessage(cleanText)}
                  </div>
                  <div className={`flex items-center gap-2 mt-1 ${isUser ? 'pr-1' : 'pl-1'}`}>
                    {msg.created_at && (
                      <span className="text-[0.65rem] text-slate-400 dark:text-slate-500">
                        {new Date(msg.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    {isUser && (
                      <span className="text-[0.65rem] text-slate-400 dark:text-slate-500 flex items-center gap-[3px]">
                      {isCurrentlySending ? (
                        <><Clock size={10} /> กำลังส่ง...</>
                      ) : (
                        <><Check size={12} className="text-emerald-500" /> ส่งแล้ว</>
                      )}
                    </span>
                    )}
                  </div>
                </div>
                {isUser && (
                  <div className="w-7 h-7 bg-blue-100 dark:bg-slate-700 rounded-full flex items-center justify-center shrink-0 mb-5 transition-colors">
                    <User size={16} className="text-blue-700 dark:text-blue-300" />
                  </div>
                )}
                </div>
              </div>
            );
          })}

          {isSending && (
            <div className="flex justify-start items-end gap-2">
              <div className="w-7 h-7 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center border border-blue-100 dark:border-slate-700 shrink-0 transition-colors">
                <Bot size={16} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-[20px_20px_20px_4px] shadow-sm border border-blue-100 dark:border-slate-700 flex gap-[5px] transition-colors">
                 <span className="w-1.5 h-1.5 bg-blue-300 dark:bg-slate-500 rounded-full animate-[bounce_1.4s_infinite_ease-in-out_both] delay-[-0.32s]"></span>
                 <span className="w-1.5 h-1.5 bg-blue-300 dark:bg-slate-500 rounded-full animate-[bounce_1.4s_infinite_ease-in-out_both] delay-[-0.16s]"></span>
                 <span className="w-1.5 h-1.5 bg-blue-300 dark:bg-slate-500 rounded-full animate-[bounce_1.4s_infinite_ease-in-out_both]"></span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} style={{ height: '1px' }} />
        </div>

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <button
            onClick={() => {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
              setShowScrollButton(false);
            }}
            className="absolute bottom-40 right-5 w-11 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-600/30 z-20 border-none cursor-pointer transition-transform hover:scale-110 active:scale-95"
          >
            <ChevronDown size={24} />
          </button>
        )}

        {/* Modal ล้างแชท */}
        {showClearConfirm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex justify-center items-center p-5">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl w-full max-w-[320px] shadow-2xl transition-colors">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="m-0 text-center text-[1.2rem] text-slate-800 dark:text-slate-100 font-bold mb-2">ล้างประวัติการแชท?</h3>
              <p className="m-0 text-center text-slate-500 dark:text-slate-400 text-[0.9rem] mb-6">ข้อความทั้งหมดจะถูกลบและไม่สามารถกู้คืนได้</p>
              <div className="flex gap-2.5">
                <button onClick={() => setShowClearConfirm(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-colors">ยกเลิก</button>
                <button onClick={() => { setShowClearConfirm(false); clearChat(false); }} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold shadow-md shadow-red-500/20 transition-all active:scale-95">ยืนยันลบ</button>
              </div>
            </div>
          </div>
        )}

        {/* Full Screen Image Modal */}
        {fullScreenImage && (
          <div className="fixed inset-0 z-[2000] bg-black/90 flex justify-center items-center p-4 backdrop-blur-sm" onClick={() => setFullScreenImage(null)}>
            <img src={fullScreenImage} className="max-w-full max-h-full object-contain rounded-lg" alt="Full screen" />
            <button className="absolute top-4 right-4 bg-white/20 text-white w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/40 border-none cursor-pointer">
              <X size={24} />
            </button>
          </div>
        )}

        {/* 🌟 Input Area */}
        <div className="py-4 px-5 bg-white dark:bg-slate-800 border-t border-blue-100 dark:border-slate-700 flex gap-3 shadow-[0_-4px_20px_rgba(37,99,235,0.03)] z-10 transition-colors">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isSending) sendMessage();
            }}
            disabled={isSending}
            placeholder="พิมพ์ข้อความที่นี่..."
            className="flex-1 py-3.5 px-5 rounded-full border border-blue-200 dark:border-slate-600 outline-none text-[0.95rem] bg-blue-50 dark:bg-slate-700 focus:bg-white dark:focus:bg-slate-800 text-blue-900 dark:text-blue-50 placeholder-slate-400 dark:placeholder-slate-400 transition-colors focus:border-blue-600 dark:focus:border-blue-500"
          />
          <button 
            onClick={sendMessage} 
            disabled={isSending || !input.trim()} 
            className={`w-[50px] h-[50px] flex items-center justify-center rounded-full border-none cursor-pointer shrink-0 transition-all ${
              !input.trim() || isSending 
                ? "bg-blue-300 dark:bg-slate-600 text-white cursor-not-allowed shadow-none" 
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)] active:scale-95"
            }`}
          >
            <Send size={20} className="ml-1" />
          </button>
        </div>
      </div>
      {/* 🎉 Clear Chat Confirm Modal (Top) */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[9999] flex justify-center items-start bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 flex flex-col items-center shadow-2xl mt-[60px] w-[85%] max-w-[340px] animate-[slideDown_0.3s_cubic-bezier(0.175,0.885,0.32,1.275)] transition-colors">
            <div className="w-14 h-14 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4 text-red-500 transition-colors">
              <Trash2 size={28} strokeWidth={2.5} />
            </div>
            
            <h2 className="text-blue-900 dark:text-blue-50 m-0 mb-2 text-[1.2rem] font-bold text-center">ล้างประวัติการแชท?</h2>
            <p className="text-slate-500 dark:text-slate-400 m-0 mb-6 text-center text-[0.9rem] leading-relaxed">
              ข้อความจะถูกลบและไม่สามารถกู้คืนได้
            </p>
            
            <div className="flex gap-2.5 w-full">
              <button 
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 p-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-none rounded-xl text-[0.95rem] font-bold cursor-pointer transition-colors hover:bg-slate-200 dark:hover:bg-slate-600"
              >
                ยกเลิก
              </button>
              <button 
                onClick={() => {
                  setShowClearConfirm(false);
                  clearChat(false);
                }}
                className="flex-1 p-3 bg-red-500 hover:bg-red-600 text-white border-none rounded-xl text-[0.95rem] font-bold cursor-pointer shadow-md transition-colors active:scale-95"
              >
                ลบประวัติ
              </button>
            </div>
            
            <style>{`
              @keyframes slideDown {
                from { transform: translateY(-30px) scale(0.95); opacity: 0; }
                to { transform: translateY(0) scale(1); opacity: 1; }
              }
            `}</style>
          </div>
        </div>
      )}

      {/* 🟢 Message Context Menu (Long Press) */}
      {selectedMessage && (
        <div 
          onClick={() => setSelectedMessage(null)}
          className="fixed inset-0 z-[9999] flex justify-center items-center bg-slate-900/40 backdrop-blur-sm"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 rounded-2xl w-[220px] flex flex-col shadow-2xl overflow-hidden animate-[scaleIn_0.2s_ease-out] transition-colors"
          >
            <button 
              onClick={() => deleteMessage(selectedMessage.id)}
              className="flex items-center gap-3 py-4 px-5 bg-transparent border-none cursor-pointer text-[0.95rem] font-bold text-red-500 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Trash2 size={18} className="text-red-500" /> ลบข้อความ
            </button>
            
            <style>{`
              @keyframes scaleIn {
                from { transform: scale(0.9); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
              }
            `}</style>
          </div>
        </div>
      )}


    </div>
  );
}
