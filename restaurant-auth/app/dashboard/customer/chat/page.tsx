"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  
  // 🔥 Ref สำหรับเลื่อนจอลงมาล่างสุดอัตโนมัติ
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const AUTO_CLEAR_TIME = 15 * 60 * 1000;

  useEffect(() => {
    const id = localStorage.getItem("user_id");
    if (!id) {
      router.push("/login");
      return;
    }
    setUserId(Number(id));
  }, []);

  useEffect(() => {
    if (!userId) return;
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
  }, [userId]);

  // 🔥 เลื่อนจอลงอัตโนมัติเมื่อมีข้อความใหม่
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const clearChat = async (isAuto = false) => {
    if (!userId) return;

    if (!isAuto && !confirm("ต้องการล้างประวัติการแชททั้งหมดใช่หรือไม่?")) {
      return;
    }

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

  useEffect(() => {
    let timer = setTimeout(() => {
      if (messages.length > 0) {
        clearChat(true);
      }
    }, AUTO_CLEAR_TIME);
    return () => clearTimeout(timer);
  }, [messages]);

  const formatMessage = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#3b82f6", // สีฟ้าสว่าง
              textDecoration: "underline",
              wordBreak: "break-all",
              fontWeight: "500"
            }}
          >
            {part}
          </a>
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

    const userMsg = { sender: "user", text: currentInput };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: currentInput, user_id: userId }),
      });

      const data = await res.json();
      const botMsg = { sender: "bot", text: data.reply };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  // ==========================================
  // 🔥 UI Rendering
  // ==========================================
  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#6b7280' }}>
      <p>กำลังโหลดหน้าต่างแชท...</p>
    </div>
  );

  return (
    <div style={{ 
      maxWidth: "600px", 
      margin: "20px auto", 
      backgroundColor: "#ffffff", 
      borderRadius: "16px", 
      boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      height: "85vh",
      border: "1px solid #e5e7eb"
    }}>
      
      {/* Header */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        padding: "16px 20px",
        backgroundColor: "#f8fafc",
        borderBottom: "1px solid #e5e7eb"
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '10px', height: '10px', backgroundColor: '#10b981', borderRadius: '50%' }}></div>
          <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "600", color: "#1f2937" }}>DineManager Bot</h2>
        </div>
        <button
          onClick={() => clearChat(false)}
          style={{
            padding: "6px 12px",
            backgroundColor: "#fee2e2",
            color: "#ef4444",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: "500",
            transition: "background 0.2s"
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#fecaca"}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#fee2e2"}
        >
          🗑️ ล้างแชท
        </button>
      </div>

      {/* Chat History Area */}
      <div style={{ 
        flex: 1, 
        overflowY: "auto", 
        padding: "20px", 
        backgroundColor: "#f0f2f5",
        display: "flex",
        flexDirection: "column",
        gap: "12px"
      }}>
        {messages.map((msg, i) => {
          const isUser = msg.sender === "user";
          return (
            <div key={i} style={{ 
              display: "flex", 
              justifyContent: isUser ? "flex-end" : "flex-start",
              alignItems: "flex-end"
            }}>
              {!isUser && (
                <div style={{ marginRight: '8px', fontSize: '20px' }}>🤖</div>
              )}
              
              <div style={{
                maxWidth: "75%",
                background: isUser ? "linear-gradient(135deg, #2563eb, #1d4ed8)" : "#ffffff",
                color: isUser ? "#ffffff" : "#1f2937",
                padding: "10px 14px",
                borderRadius: isUser ? "16px 16px 2px 16px" : "16px 16px 16px 2px",
                boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
                wordBreak: "break-word",
                fontSize: "14px"
              }}>
                {formatMessage(msg.text)}
              </div>
            </div>
          );
        })}

        {/* Typing Indicator (แสดงตอนกดส่งแล้วรอ API) */}
        {isSending && (
          <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "flex-end" }}>
            <div style={{ marginRight: '8px', fontSize: '20px' }}>🤖</div>
            <div style={{
              background: "#ffffff",
              padding: "12px 16px",
              borderRadius: "16px 16px 16px 2px",
              boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
              display: "flex",
              gap: "4px"
            }}>
               <span style={{ width: '6px', height: '6px', backgroundColor: '#9ca3af', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '-0.32s' }}></span>
               <span style={{ width: '6px', height: '6px', backgroundColor: '#9ca3af', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '-0.16s' }}></span>
               <span style={{ width: '6px', height: '6px', backgroundColor: '#9ca3af', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both' }}></span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{ 
        padding: "16px", 
        backgroundColor: "#ffffff", 
        borderTop: "1px solid #e5e7eb",
        display: "flex",
        gap: "10px"
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
            padding: "12px 16px", 
            borderRadius: "24px", 
            border: "1px solid #d1d5db",
            outline: "none",
            fontSize: "14px",
            backgroundColor: isSending ? "#f3f4f6" : "#ffffff",
            transition: "border-color 0.2s"
          }}
          onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
          onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
        />
        <button 
          onClick={sendMessage} 
          disabled={isSending || !input.trim()} 
          style={{ 
            padding: "0 20px", 
            backgroundColor: !input.trim() || isSending ? "#9ca3af" : "#2563eb",
            color: "white",
            border: "none", 
            borderRadius: "24px",
            fontWeight: "600",
            cursor: !input.trim() || isSending ? "not-allowed" : "pointer",
            transition: "background-color 0.2s"
          }}
        >
          ส่ง
        </button>
      </div>

      {/* เพิ่ม style สำหรับ animation จุดไข่ปลา */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}} />

    </div>
  );
}