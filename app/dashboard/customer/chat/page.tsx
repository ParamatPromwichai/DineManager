"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react"; // ➕ 1. นำเข้า useSession
import { Send, Trash2, ArrowLeft, Bot, User, Zap } from "lucide-react";

export default function ChatPage() {
  const router = useRouter();
  
  // ➕ 2. ดึงข้อมูล session จาก NextAuth แทน localStorage
  const { data: session, status } = useSession();

  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ➕ 3. ดึง userId จาก session
  const userId = (session?.user as any)?.id;

  // ➕ 4. เช็คสถานะล็อกอิน ถ้ายังไม่ล็อกอินให้เด้งไปหน้า login
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // ➕ 5. ดึงประวัติแชทเมื่อล็อกอินสำเร็จ
  useEffect(() => {
    // ต้องรอให้ session โหลดเสร็จก่อนและต้องมี userId
    if (status !== "authenticated" || !userId) return;

    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/chat?user_id=${userId}`);
        const data = await res.json();
        setMessages(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [status, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const clearChat = async (isAuto = false) => {
    if (!userId) return;
    if (!isAuto && !confirm("ต้องการล้างประวัติการแชททั้งหมดใช่หรือไม่?")) return;

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
    // แยกข้อความด้วย URL หรือ [ORDER_BUTTON:xxx]
    const regex = /(https?:\/\/[^\s]+|\[ORDER_BUTTON(?::[^\]]+)?\])/g;
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (!part) return null;
      
      // ถ้าเป็น URL
      if (part.match(/^https?:\/\//)) {
        // ตรวจสอบว่าเป็นลิงก์ Google Maps แบบพิกัดหรือไม่
        const mapMatch = part.match(/^https?:\/\/maps\.google\.com\/\?q=([\d\.\-]+),([\d\.\-]+)/);
        if (mapMatch) {
          const lat = mapMatch[1];
          const lon = mapMatch[2];
          return (
            <div key={index} style={{ marginTop: '12px', marginBottom: '8px', borderRadius: '12px', overflow: 'hidden', border: '2px solid #DCE8FF', boxShadow: '0 4px 12px rgba(37,99,235,0.1)' }}>
              <iframe
                width="100%"
                height="220"
                frameBorder="0"
                style={{ border: 0, display: 'block' }}
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
            style={{ color: "#93C5FD", textDecoration: "underline", wordBreak: "break-all", fontWeight: "600" }}
          >
            {part}
          </a>
        );
      }
      
      // ถ้าเป็นปุ่มสั่งอาหาร
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
            style={{
              display: "block",
              marginTop: "8px",
              padding: "8px 16px",
              backgroundColor: "#10B981", // สีเขียวโดดเด่น
              color: "white",
              border: "none",
              borderRadius: "20px",
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow: "0 4px 6px rgba(16, 185, 129, 0.2)",
              transition: "transform 0.1s, boxShadow 0.1s"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "scale(1.02)";
              e.currentTarget.style.boxShadow = "0 6px 12px rgba(16, 185, 129, 0.3)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "0 4px 6px rgba(16, 185, 129, 0.2)";
            }}
          >
            🛒 {buttonText}
          </button>
        );
      }
      
      return <span key={index} style={{ whiteSpace: "pre-wrap", lineHeight: "1.5" }}>{part}</span>;
    });
  };

  const sendMessage = async () => {
    if (!input.trim() || !userId || isSending) return;

    setIsSending(true);
    const currentInput = input;
    setInput("");

    setMessages((prev) => [...prev, { sender: "user", text: currentInput }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: currentInput, user_id: userId }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { sender: "bot", text: data.reply }]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  // รวม Loading ของระบบแชทกับ NextAuth เข้าด้วยกัน
  if (status === "loading" || loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#F4F8FF', gap: 15 }}>
      <div style={{ width: '40px', height: '40px', border: '4px solid #2563EB', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      <p style={{ color: '#1E3A8A', fontWeight: 'bold' }}>กำลังโหลดหน้าต่างแชท...</p>
      <style dangerouslySetInnerHTML={{__html: `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}} />
    </div>
  );

  return (
    <div style={{ 
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: "70px", 
      backgroundColor: "#F4F8FF", 
      display: "flex",
      flexDirection: "column",
      zIndex: 10, 
      fontFamily: "sans-serif"
    }}>
      
      <div style={{ maxWidth: "600px", margin: "0 auto", width: "100%", height: "100%", display: "flex", flexDirection: "column", backgroundColor: "#F4F8FF", position: "relative", boxShadow: "0 0 20px rgba(0,0,0,0.05)" }}>
        
        {/* 🌟 Header */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          padding: "16px 20px",
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #DCE8FF",
          boxShadow: "0 2px 10px rgba(37,99,235,0.03)",
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '36px', height: '36px', backgroundColor: '#EFF6FF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #BFDBFE' }}>
                <Bot size={20} color="#2563EB" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "900", color: "#1E3A8A" }}>DineManager Bot</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#10B981', fontWeight: 'bold' }}>
                  <div style={{ width: '8px', height: '8px', backgroundColor: '#10B981', borderRadius: '50%' }}></div> ออนไลน์
                </div>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => clearChat(false)}
            style={{
              padding: "8px 12px",
              backgroundColor: "#FEF2F2",
              color: "#EF4444",
              border: "1px solid #FEE2E2",
              borderRadius: "12px",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "background 0.2s"
            }}
          >
            <Trash2 size={16} /> ล้างแชท
          </button>
        </div>

        {/* 🌟 Chat History Area */}
        <div style={{ 
          flex: 1, 
          overflowY: "auto", 
          padding: "20px", 
          backgroundColor: "#F4F8FF",
          display: "flex",
          flexDirection: "column",
          gap: "18px"
        }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', margin: 'auto', color: '#64748B' }}>
              <div style={{ width: '60px', height: '60px', backgroundColor: '#E0EFFF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
                <Bot size={32} color="#2563EB" />
              </div>
              <h3 style={{ margin: '0 0 8px 0', color: '#1E3A8A', fontWeight: 'bold' }}>ยินดีต้อนรับสู่ DineManager</h3>
              <p style={{ fontSize: '0.9rem', margin: 0 }}>พิมพ์สอบถามเมนู หรือข้อมูลร้านได้เลยครับ 👋</p>
            </div>
          )}

          {messages.map((msg, i) => {
            const isUser = msg.sender === "user";
            let cleanText = msg.text || "";
            let isGemini = false;
            
            if (cleanText.includes("*(ตอบโดย Groq AI ⚡)*")) {
              isGemini = true;
              cleanText = cleanText.replace(/\n\n\*\((ตอบโดย Groq AI ⚡)\)\*/g, "").replace(/\*\((ตอบโดย Groq AI ⚡)\)\*/g, "").trim();
            } else if (cleanText.includes("*(ตอบโดย Auto-Bot 🤖)*") || cleanText.includes("*(ตอบโดย Auto Bot 🤖)*")) {
              cleanText = cleanText.replace(/\n\n\*\((ตอบโดย Auto-Bot 🤖|ตอบโดย Auto Bot 🤖)\)\*/g, "").replace(/\*\((ตอบโดย Auto-Bot 🤖|ตอบโดย Auto Bot 🤖)\)\*/g, "").trim();
            }

            return (
              <div key={i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", alignItems: "flex-end", gap: "8px" }}>
                {!isUser && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", flexShrink: 0, marginBottom: "4px" }}>
                    <div style={{ 
                      width: '32px', height: '32px', 
                      backgroundColor: isGemini ? '#FDF4FF' : '#ffffff', 
                      borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      border: isGemini ? '1px solid #F0ABFC' : '1px solid #DCE8FF'
                    }}>
                      {isGemini ? <Zap size={16} color="#D946EF" /> : <Bot size={16} color="#2563EB" />}
                    </div>
                    <span style={{ fontSize: "0.65rem", color: isGemini ? "#D946EF" : "#2563EB", fontWeight: "bold" }}>
                      {isGemini ? "Groq" : "Auto Bot"}
                    </span>
                  </div>
                )}
                <div style={{
                  maxWidth: "75%",
                  background: isUser ? "linear-gradient(135deg, #1D4ED8, #2563EB)" : (isGemini ? "linear-gradient(135deg, #FAF5FF, #F3E8FF)" : "#ffffff"),
                  color: isUser ? "#ffffff" : (isGemini ? "#4C1D95" : "#1E3A8A"),
                  padding: "12px 16px",
                  borderRadius: isUser ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
                  boxShadow: isUser ? "0 4px 12px rgba(37,99,235,0.2)" : "0 4px 12px rgba(37,99,235,0.05)",
                  border: isUser ? "none" : (isGemini ? "1px solid #E9D5FF" : "1px solid #DCE8FF"),
                  wordBreak: "break-word",
                  fontSize: "0.95rem",
                  fontWeight: "500"
                }}>
                  {formatMessage(cleanText)}
                </div>
                {isUser && (
                  <div style={{ width: '28px', height: '28px', backgroundColor: '#DBEAFE', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <User size={16} color="#1D4ED8" />
                  </div>
                )}
              </div>
            );
          })}

          {isSending && (
            <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "flex-end", gap: "8px" }}>
              <div style={{ width: '28px', height: '28px', backgroundColor: '#ffffff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #DCE8FF', flexShrink: 0 }}>
                <Bot size={16} color="#2563EB" />
              </div>
              <div style={{ background: "#ffffff", padding: "16px", borderRadius: "20px 20px 20px 4px", boxShadow: "0 4px 12px rgba(37,99,235,0.05)", border: "1px solid #DCE8FF", display: "flex", gap: "5px" }}>
                 <span style={{ width: '6px', height: '6px', backgroundColor: '#93C5FD', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '-0.32s' }}></span>
                 <span style={{ width: '6px', height: '6px', backgroundColor: '#93C5FD', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '-0.16s' }}></span>
                 <span style={{ width: '6px', height: '6px', backgroundColor: '#93C5FD', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both' }}></span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} style={{ height: '1px' }} />
        </div>

        {/* 🌟 Input Area */}
        <div style={{ 
          padding: "16px 20px", 
          paddingBottom: "calc(16px + env(safe-area-inset-bottom))", 
          backgroundColor: "#ffffff", 
          borderTop: "1px solid #DCE8FF",
          display: "flex",
          gap: "12px",
          boxShadow: "0 -4px 20px rgba(37,99,235,0.03)",
          zIndex: 10
        }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isSending) sendMessage();
            }}
            disabled={isSending}
            placeholder="พิมพ์ข้อความที่นี่..."
            style={{ 
              flex: 1, 
              padding: "14px 20px", 
              borderRadius: "24px", 
              border: "1px solid #BFDBFE",
              outline: "none",
              fontSize: "0.95rem",
              backgroundColor: isSending ? "#F8FAFC" : "#F4F8FF",
              color: "#1E3A8A",
              transition: "all 0.2s"
            }}
            onFocus={(e) => { e.target.style.borderColor = "#2563EB"; e.target.style.backgroundColor = "#ffffff"; }}
            onBlur={(e) => { e.target.style.borderColor = "#BFDBFE"; e.target.style.backgroundColor = "#F4F8FF"; }}
          />
          <button 
            onClick={sendMessage} 
            disabled={isSending || !input.trim()} 
            style={{ 
              width: "50px", height: "50px", display: "flex", alignItems: "center", justifyContent: "center",
              backgroundColor: !input.trim() || isSending ? "#93C5FD" : "#2563EB",
              color: "white", border: "none", borderRadius: "50%",
              cursor: !input.trim() || isSending ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              boxShadow: !input.trim() || isSending ? "none" : "0 4px 12px rgba(37,99,235,0.3)",
              flexShrink: 0
            }}
          >
            <Send size={20} style={{ marginLeft: '4px' }} />
          </button>
        </div>

        <style dangerouslySetInnerHTML={{__html: `
          @keyframes bounce {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
          }
        `}} />
      </div>
    </div>
  );
}
