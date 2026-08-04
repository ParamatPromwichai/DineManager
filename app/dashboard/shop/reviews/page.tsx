'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
const fetcher = (url: string) => fetch(url).then(res => res.json());
import {
  Star,
  MessageCircle,
  CornerDownRight,
  Send,
  Loader2,
  AlertCircle,
  Pencil,
  X,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

type Review = {
  id: number;
  rating: number;
  comment: string | null;
  shop_reply: string | null;
  created_at: string;
  customer_name: string;
  menu_name: string | null;
  is_edited?: boolean | number;
  is_shop_reply_edited?: boolean | number;
};

export default function ShopReviewsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isShop = status === 'authenticated' && (session?.user as any)?.role === 'shop';

  const { data: fetchedData, mutate: mutateReviews, isLoading: isReviewsLoading } = useSWR<{reviews: Review[]}>(
    isShop ? '/api/shop/reviews' : null,
    fetcher
  );
  const reviews = fetchedData?.reviews || [];
  
  const [replyText, setReplyText] = useState<{ [key: number]: string }>({});
  const [submittingReply, setSubmittingReply] = useState<number | null>(null);
  const [editingReply, setEditingReply] = useState<number | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated' || (status === 'authenticated' && (session.user as any)?.role !== 'shop')) {
      router.replace('/login/shop');
    }
  }, [status, session, router]);

  const handleReplySubmit = async (reviewId: number) => {
    const text = replyText[reviewId];
    if (!text || text.trim() === '') return;

    setSubmittingReply(reviewId);
    try {
      const res = await fetch('/api/shop/reviews/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_id: reviewId, reply_text: text }),
      });
      const data = await res.json();
      if (res.ok) {
        mutateReviews({ reviews: reviews.map(r => r.id === reviewId ? { ...r, shop_reply: text, is_shop_reply_edited: data.is_shop_reply_edited } : r) }, false);
        setReplyText({ ...replyText, [reviewId]: '' });
        setEditingReply(null);
      } else {
        alert('เกิดข้อผิดพลาดในการส่งข้อความตอบกลับ');
      }
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmittingReply(null);
    }
  };

  // --- Loading State (Skeleton) ---
  if (status === 'loading' || (isReviewsLoading && !fetchedData)) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-8 font-sans pb-24 animate-pulse">
        <div className="max-w-[800px] mx-auto">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
                <div className="w-48 h-8 bg-slate-200 rounded-lg"></div>
              </div>
              <div className="w-64 h-4 bg-slate-200 rounded-md"></div>
            </div>
            <div className="w-28 h-10 bg-slate-200 rounded-xl"></div>
          </div>

          {/* Reviews List Skeleton */}
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white border border-slate-100 rounded-[1.5rem] p-6 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-2">
                    <div className="w-32 h-5 bg-slate-200 rounded-md"></div>
                    <div className="w-48 h-3 bg-slate-200 rounded-md"></div>
                  </div>
                  <div className="w-16 h-7 bg-slate-200 rounded-full"></div>
                </div>
                
                <div className="w-full h-16 bg-slate-50 border border-slate-100 rounded-2xl mb-4 mt-2"></div>
                
                <div className="mt-4 flex gap-3">
                  <div className="w-6 h-6 mt-2 shrink-0"></div>
                  <div className="w-full h-12 bg-slate-50 border border-slate-200 rounded-2xl"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 font-sans pb-24">
      <div className="max-w-5xl w-full mx-auto space-y-5">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 sm:gap-4 shrink-0 w-full lg:w-auto">
            <Link href="/dashboard/shop" className="shrink-0 flex items-center justify-center gap-2 p-2.5 sm:px-5 sm:py-2 bg-slate-900 text-white rounded-xl sm:rounded-full font-bold text-sm hover:bg-slate-800 transition-colors shadow-sm">
              <ArrowLeft size={18} />
              <span className="hidden sm:inline">กลับ</span>
            </Link>
            <div className="hidden sm:block w-px h-10 bg-slate-200"></div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2 sm:gap-3 truncate">
                <Star className="text-amber-500 fill-amber-500 shrink-0" size={24} />
                <span className="truncate">รีวิวจากลูกค้า</span>
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-0.5 hidden sm:block">
                อ่านและตอบกลับความคิดเห็นของลูกค้าเพื่อพัฒนาบริการ
              </p>
            </div>
          </div>
        </div>

        {/* Reviews List */}
        <div className="space-y-6">
          {reviews.length === 0 ? (
            <div className="bg-white rounded-[2rem] p-12 text-center border border-slate-200/60 shadow-sm">
              <MessageCircle size={48} className="text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-400">ยังไม่มีรีวิวในขณะนี้</h3>
            </div>
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="bg-white border border-slate-200/60 rounded-[1.5rem] p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base sm:text-lg">
                      {review.customer_name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-semibold text-slate-400">
                        {new Date(review.created_at).toLocaleString('th-TH')}
                        {Boolean(review.is_edited) && <span className="ml-1 italic">(แก้ไขแล้ว)</span>}
                      </span>
                      {review.menu_name && (
                        <span className="text-[10px] sm:text-xs font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                          {review.menu_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                    <Star size={16} className="text-amber-500 fill-amber-500" />
                    <span className="font-black text-amber-700">{review.rating}</span>
                  </div>
                </div>

                {review.comment && (
                  <p className="text-slate-600 font-medium text-sm sm:text-base bg-slate-50 p-4 rounded-2xl mb-4 border border-slate-100">
                    "{review.comment}"
                  </p>
                )}

                {/* Reply Section */}
                {review.shop_reply && editingReply !== review.id ? (
                  <div className="mt-4 flex gap-3">
                    <CornerDownRight size={20} className="text-slate-300 shrink-0 mt-1" />
                    <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl w-full group relative">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                          ตอบกลับจากทางร้าน 
                          {Boolean(review.is_shop_reply_edited) && <span className="text-[10px] font-normal text-blue-400 normal-case ml-1 italic">(แก้ไขแล้ว)</span>}
                        </h4>
                        <button
                          onClick={() => {
                            setEditingReply(review.id);
                            setReplyText({ ...replyText, [review.id]: review.shop_reply || '' });
                          }}
                          className="transition-colors p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg"
                        >
                          <Pencil size={14} />
                        </button>
                      </div>
                      <p className="text-slate-700 text-sm font-semibold pr-6">{review.shop_reply}</p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex gap-3">
                    <CornerDownRight size={20} className="text-slate-300 shrink-0 mt-3" />
                    <div className="relative w-full flex items-center gap-2">
                      <div className="relative w-full">
                        <input
                          type="text"
                          placeholder="เขียนตอบกลับรีวิวนี้..."
                          value={replyText[review.id] || ''}
                          onChange={(e) => setReplyText({ ...replyText, [review.id]: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-4 pr-12 py-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder-slate-400"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleReplySubmit(review.id);
                          }}
                          autoFocus={editingReply === review.id}
                        />
                        <button
                          onClick={() => handleReplySubmit(review.id)}
                          disabled={submittingReply === review.id || !replyText[review.id]?.trim()}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                          {submittingReply === review.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Send size={16} />
                          )}
                        </button>
                      </div>
                      {editingReply === review.id && (
                        <button
                          onClick={() => setEditingReply(null)}
                          className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors shrink-0 border border-transparent hover:border-rose-100"
                        >
                          <X size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
