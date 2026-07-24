'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { QrCode, ChefHat, Package, BarChart3, Users, MessageSquare, ArrowRight, CheckCircle2, Clock, ShieldCheck, TrendingUp, Lightbulb, ChevronLeft, ChevronRight, Bot } from 'lucide-react';
import styles from './page.module.css';

const slides = [
  {
    id: 1,
    title: 'ยกระดับร้านอาหารของคุณ',
    highlight: 'ด้วยระบบจัดการอัจฉริยะ',
    desc: 'เว็บจัดการร้านอาหารและระบบจัดการร้านอาหารที่ดีที่สุด จบทุกปัญหาความวุ่นวายด้วยเทคโนโลยีที่ออกแบบมาเพื่อธุรกิจร้านอาหาร',
    image: '/hero.png'
  },
  {
    id: 2,
    title: 'สั่งอาหารสะดวก รวดเร็วผ่าน',
    highlight: 'ระบบสแกน QR Code',
    desc: 'ลดการพึ่งพาพนักงานเสิร์ฟ ลูกค้าสามารถดูเมนูและสั่งอาหารได้เองจากโต๊ะ ออเดอร์ส่งตรงถึงครัวทันที ไร้ข้อผิดพลาด',
    image: '/hero2.png'
  },
  {
    id: 3,
    title: 'วิเคราะห์ธุรกิจ แม่นยำด้วย',
    highlight: 'รายงานยอดขายเชิงลึก',
    desc: 'จัดการสต๊อกวัตถุดิบและดูรายงานยอดขายแบบเรียลไทม์ รู้ต้นทุน กำไร และเมนูขายดี เพื่อวางแผนกลยุทธ์ได้อย่างชาญฉลาด',
    image: '/hero3.png'
  }
];

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));

  const features = [
    {
      title: 'ระบบสั่งอาหารผ่าน QR Code',
      description: 'ลูกค้าสามารถสแกนคิวอาร์โค้ดที่โต๊ะ เพื่อดูเมนูอาหารและกดสั่งได้ทันที ไม่ต้องรอพนักงานมารับออเดอร์ ลดความผิดพลาดและเพิ่มความรวดเร็ว',
      icon: <QrCode size={28} />
    },
    {
      title: 'ระบบจัดการออเดอร์ห้องครัว',
      description: 'ออเดอร์ที่ลูกค้าสั่งจะถูกส่งตรงเข้าสู่หน้าจอของห้องครัวทันที (Kitchen Display System) เชฟสามารถจัดการและติดตามสถานะแต่ละออเดอร์ได้อย่างแม่นยำ',
      icon: <ChefHat size={28} />
    },
    {
      title: 'ระบบจัดการสต๊อกวัตถุดิบ',
      description: 'ควบคุมและติดตามการเบิกจ่ายวัตถุดิบแบบเรียลไทม์ พร้อมระบบแจ้งเตือนเมื่อวัตถุดิบใกล้หมด ป้องกันปัญหาของขาดและลดต้นทุนจม',
      icon: <Package size={28} />
    },
    {
      title: 'รายงานยอดขายและสถิติ',
      description: 'สรุปยอดขายประจำวัน เดือน หรือปี แสดงผลในรูปแบบกราฟที่เข้าใจง่าย ช่วยให้คุณวิเคราะห์ข้อมูลและวางแผนธุรกิจได้อย่างชาญฉลาด',
      icon: <BarChart3 size={28} />
    },
    {
      title: 'Chatbot อัจฉริยะตอบคำถาม',
      description: 'ระบบผู้ช่วยอัตโนมัติคอยตอบคำถามลูกค้า แนะนำเมนู และให้ข้อมูลร้านตลอด 24 ชั่วโมง ช่วยลดภาระพนักงานได้อย่างมีประสิทธิภาพ',
      icon: <Bot size={28} />
    },
    {
      title: 'ช่องทางสื่อสารในร้าน (Chat)',
      description: 'ระบบแชทภายในสำหรับพนักงานและผู้จัดการ ให้การประสานงานราบรื่น ไม่ว่าจะเป็นการแจ้งเตือนจากห้องครัวหรือพนักงานเสิร์ฟ',
      icon: <MessageSquare size={28} />
    }
  ];

  return (
    <div className={styles.pageWrapper}>
      {/* Background Elements */}
      <div className={styles.ambientGlow}></div>
      <div className={styles.ambientGlow2}></div>

      {/* Navigation */}
      <nav className={styles.navbar}>
        <div className={styles.logo}>
          <ChefHat size={28} style={{ color: '#0ea5e9' }} />
          <span>DineManager</span>
        </div>
        <Link href="/login" className={styles.navLink}>
          เข้าสู่ระบบ
        </Link>
      </nav>

      {/* Hero Slider Section */}
      <main className={styles.heroSection}>
        
        {slides.map((slide, index) => (
          <div 
            key={slide.id} 
            className={`${styles.slideContainer} ${index === currentSlide ? styles.activeSlide : ''}`}
          >
            <div className={styles.heroContent}>
              <h1 className={styles.title}>
                {slide.title} <br/> <span className={styles.highlight}>{slide.highlight}</span>
              </h1>
              <p className={styles.description}>
                {slide.desc}
              </p>
              <div className={styles.btnGroup}>
                <Link href="/login" className={styles.primaryBtn}>
                  ทดลองใช้งานฟรี <ArrowRight size={20} />
                </Link>
                <Link href="#features" className={styles.secondaryBtn}>
                  ดูฟีเจอร์ทั้งหมด
                </Link>
              </div>
              <div style={{ marginTop: '2rem', display: 'flex', gap: '1.5rem', color: '#64748b', fontSize: '0.9rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={16} color="#4ade80" /> ใช้งานง่าย</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={16} color="#4ade80" /> รองรับทุกอุปกรณ์</span>
              </div>
            </div>

            <div className={styles.heroImageContainer}>
              <Image 
                src={slide.image} 
                alt={slide.highlight}
                width={800} 
                height={600} 
                className={styles.heroImage}
                priority={index === 0}
              />
            </div>
          </div>
        ))}

        {/* Slider Controls */}
        <button onClick={prevSlide} className={`${styles.sliderArrow} ${styles.prevArrow}`}>
          <ChevronLeft size={32} />
        </button>
        <button onClick={nextSlide} className={`${styles.sliderArrow} ${styles.nextArrow}`}>
          <ChevronRight size={32} />
        </button>

        <div className={styles.sliderDots}>
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`${styles.dot} ${index === currentSlide ? styles.activeDot : ''}`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className={styles.featuresSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>ฟีเจอร์ครบครัน ตอบโจทย์ทุกการจัดการ</h2>
          <p className={styles.sectionDesc}>
            เรารวบรวมเครื่องมือที่ดีที่สุดไว้ให้คุณ เพื่อให้การบริหารร้านอาหารเป็นเรื่องง่าย 
            ลดข้อผิดพลาด และเพิ่มยอดขายได้อย่างมีประสิทธิภาพ
          </p>
        </div>

        <div className={styles.grid}>
          {features.map((feature, index) => (
            <div key={index} className={styles.card}>
              <div className={styles.cardIcon}>
                {feature.icon}
              </div>
              <h3 className={styles.cardTitle}>{feature.title}</h3>
              <p className={styles.cardDesc}>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className={styles.whySection}>
        <div className={styles.whyHeader}>
          <h2 className={styles.whyTitle}>ทำไมถึงต้องใช้ DineManager?</h2>
          <p className={styles.whyDesc}>เราคือผู้ช่วยที่จะเปลี่ยนร้านอาหารธรรมดา ให้กลายเป็นร้านอาหารยุคใหม่ที่มีประสิทธิภาพสูงสุด</p>
        </div>
        
        <div className={styles.whyGrid}>
          <div className={styles.whyCard}>
            <div className={styles.whyIcon}><Clock size={32} /></div>
            <h3>ประหยัดเวลา</h3>
            <p>บอกลาการจดออเดอร์ด้วยกระดาษ ออเดอร์ส่งตรงถึงครัวทันที ลูกค้าไม่ต้องรอนาน พนักงานมีเวลาดูแลลูกค้ามากขึ้น</p>
          </div>
          <div className={styles.whyCard}>
            <div className={styles.whyIcon}><ShieldCheck size={32} /></div>
            <h3>ลดข้อผิดพลาด</h3>
            <p>ขจัดปัญหาออเดอร์ตกหล่น ทำผิดโต๊ะ หรือลายมืออ่านไม่ออก ทุกขั้นตอนถูกบันทึกในระบบอย่างแม่นยำ</p>
          </div>
          <div className={styles.whyCard}>
            <div className={styles.whyIcon}><TrendingUp size={32} /></div>
            <h3>เพิ่มผลกำไร</h3>
            <p>ควบคุมสต๊อกวัตถุดิบไม่ให้สูญเปล่า พร้อมรายงานยอดขายเชิงลึกที่ช่วยให้คุณวิเคราะห์และลดต้นทุนได้อย่างตรงจุด</p>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className={styles.storySection}>
        <div className={styles.storyContainer}>
          <div className={styles.storyContent}>
            <div className={styles.storyBadge}>
              <Lightbulb size={18} /> จุดเริ่มต้นของเรา
            </div>
            <h2 className={styles.storyTitle}>จากปัญหาจริง<br/>สู่ระบบที่สมบูรณ์แบบ</h2>
            <p className={styles.storyText}>
              DineManager เกิดขึ้นจากประสบการณ์ตรงของทีมผู้สร้างที่เคยคลุกคลีกับธุรกิจร้านอาหารมาก่อน เราพบเจอกับปัญหาคลาสสิกที่ทุกร้านต้องเจอ: <strong>ความวุ่นวายหลังร้านในช่วงเวลาเร่งด่วน ออเดอร์ตกหล่น พนักงานสื่อสารผิดพลาด</strong>
            </p>
            <p className={styles.storyText}>
              หลังจากลองใช้ระบบจัดการร้านอาหารที่มีอยู่ในตลาด เราพบว่าส่วนใหญ่นั้นใช้งานยาก ซับซ้อน และไม่ตอบโจทย์การทำงานจริงของพนักงาน จึงได้พัฒนาระบบจัดการร้านอาหารในฐานะนักพัฒนาซอฟต์แวร์ จึงเกิดเป็น <strong>DineManager</strong> ขึ้นมา โดยมีเป้าหมายเดียวคือ: <em>"สร้างระบบที่เข้าใจคนทำร้านอาหารมากที่สุด ใช้งานง่ายที่สุด และแก้ปัญหาได้จริง"</em>
            </p>
            <p className={styles.storyText}>
              วันนี้ DineManager ไม่ใช่แค่โปรแกรม แต่คือผู้ช่วยที่รู้ใจ ที่พร้อมจะเติบโตไปพร้อมกับธุรกิจร้านอาหารของคุณ
            </p>
          </div>
          <div className={styles.storyImageWrapper}>
            <div className={styles.storyImageDecoration}></div>
            <Image 
              src="/hero.png" 
              alt="จุดเริ่มต้นของ DineManager" 
              width={500} 
              height={500} 
              className={styles.storyImage}
            />
          </div>
        </div>
      </section>

      {/* SEO Content Section */}
      <section className={styles.seoSection}>
        <div className={styles.seoContainer}>
          <h2 className={styles.seoTitle}>ระบบจัดการร้านอาหาร และ โปรแกรมร้านอาหารครบวงจร</h2>
          <p className={styles.seoText}>
            DineManager คือ<strong>เว็บจัดการร้านอาหาร</strong>และ<strong>ระบบจัดการร้านอาหาร</strong> (Restaurant Management System) ที่ดีที่สุด ออกแบบมาเพื่อธุรกิจร้านอาหาร คาเฟ่ และบุฟเฟ่ต์ทุกขนาด ยกระดับการทำงานด้วยฟีเจอร์ที่ครบครัน ทั้งการสั่งอาหารผ่าน QR Code, ระบบ <strong>POS ร้านอาหาร</strong>, การจัดการสต๊อกวัตถุดิบ, ระบบห้องครัว (KDS), และสรุปรายงานยอดขายแบบเรียลไทม์ ช่วยลดความผิดพลาด เพิ่มความเร็วในการให้บริการ และเพิ่มกำไรสูงสุดให้กับธุรกิจร้านอาหารของคุณอย่างยั่งยืน
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section className={styles.contactSection}>
        <div className={styles.contactContainer}>
          <div className={styles.contactHeader}>
            <h2 className={styles.contactTitle}>สนใจระบบ ติดต่อเรา</h2>
            <p className={styles.contactDesc}>ทีมงานของเราพร้อมให้คำปรึกษาและดูแลคุณอย่างใกล้ชิด</p>
          </div>
          
          <div className={styles.contactGrid}>
            <div className={styles.contactItem}>
              <div className={styles.contactIconWrapper}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              </div>
              <h4 className={styles.contactLabel}>โทรศัพท์</h4>
              <p className={styles.contactValue}>065-876-4737</p>
            </div>
            
            <div className={styles.contactItem}>
              <div className={styles.contactIconWrapper}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>
              </div>
              <h4 className={styles.contactLabel}>อีเมล</h4>
              <p className={styles.contactValue}>paramat2017games@gmail.com</p>
            </div>
            
            <div className={styles.contactItem}>
              <div className={styles.contactIconWrapper}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
              </div>
              <h4 className={styles.contactLabel}>Facebook Page</h4>
              <p className={styles.contactValue}>Paramat Promwichai</p>
            </div>
          </div>
        </div>
      </section>


      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerLogo}>
            <ChefHat size={24} style={{ color: '#0ea5e9' }} />
            <span>DineManager</span>
          </div>
          <p className={styles.copyright}>© {new Date().getFullYear()} DineManager. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}