import random
from db import *
from intent import detect_intents, is_similar

def get_response(msg, user_id):
    msg_lower = msg.lower()
    
    # 🛠️ 1. จัดการคำผิดและลบช่องว่าง
# 🛠️ 1. จัดการคำผิดและลบช่องว่าง
    msg_normalized = msg_lower.replace("กระเพรา", "กะเพรา") \
                              .replace("กะเพา", "กะเพรา") \
                              .replace("กระเพา", "กะเพรา") \
                              .replace("กระหรี่", "กะหรี่")
    msg_search = msg_normalized.replace(" ", "")
    
    intents = detect_intents(msg_normalized)
    
    # ==========================================
    # 🔥 1. เช็คท็อปปิ้งที่พิมพ์มาใน "ประโยคนี้"
    # ==========================================
    current_addons = []
    
    if "ไข่ดาว" in msg_search: current_addons.append("ไข่ดาว")
    if "ไขเจียว" in msg_search or "ไข่เจียว" in msg_search: current_addons.append("ไข่เจียว")
    if "พิเศษ" in msg_search: current_addons.append("พิเศษ")

    menus = get_all_menus() 
    menus = sorted(menus, key=lambda x: len(x[0]), reverse=True)
    
    # ==========================================
    # 🔥 2. ดึงความจำ (Context) จากประโยคก่อนหน้า
    # ==========================================
    chat_history = get_chat_history(user_id, limit=4)
    last_user_msg = ""
    last_bot_msg = ""
    
    if chat_history:
        for chat in reversed(chat_history):
            if chat['sender'] == 'user' and not last_user_msg:
                last_user_msg = chat['message'].lower()
            elif chat['sender'] == 'bot' and not last_bot_msg:
                last_bot_msg = chat['message'].lower()

    last_menu = None
    if last_user_msg:
        # ดักคำผิดในประโยคที่แล้วให้เหมือนกัน
        last_user_search = last_user_msg.replace("กระเพรา", "กะเพรา") \
                                        .replace("กะเพา", "กะเพรา") \
                                        .replace("กระเพา", "กะเพรา") \
                                        .replace("กระหรี่", "กะหรี่") \
                                        .replace(" ", "")
        for m in menus:
            menu_search = m[0].lower().replace("กระเพรา", "กะเพรา").replace("กระหรี่", "กะหรี่").replace(" ", "")
            if menu_search in last_user_search:
                last_menu = m
                break
        if not last_menu:
            for m in menus:
                if is_similar(last_user_msg, m[0].lower()):
                    last_menu = m
                    break

    if not last_menu and last_bot_msg:
        last_bot_search = last_bot_msg.replace("กระเพรา", "กะเพรา").replace("กระหรี่", "กะหรี่").replace(" ", "")
        for m in menus:
            menu_search = m[0].lower().replace("กระเพรา", "กะเพรา").replace("กระหรี่", "กะหรี่").replace(" ", "")
            if menu_search in last_bot_search:
                last_menu = m
                break

    # ==========================================
    # 🔥 3. หาเมนูหลักในประโยคปัจจุบัน
    # ==========================================
    found_menu = None
    
    for m in menus:
        menu_search = m[0].lower().replace("กระเพรา", "กะเพรา").replace("กระหรี่", "กะหรี่").replace(" ", "")
        if menu_search in msg_search:
            found_menu = m
            break

    if not found_menu:
        meats = ["หมูกรอบ", "หมูสับ", "หมูชิ้น", "หมู", "ไก่", "ทะเล", "กุ้ง", "หมึก", "ปลาหมึก", "เนื้อ"]
        for m in menus:
            menu_search = m[0].lower().replace("กระเพรา", "กะเพรา").replace("กระหรี่", "กะหรี่").replace(" ", "")
            for meat in meats:
                if meat in menu_search:
                    base_dish = menu_search.replace(meat, "").strip()
                    if base_dish and base_dish in msg_search and meat in msg_search:
                        found_menu = m
                        break
            if found_menu:
                break

    if not found_menu:
        for m in menus:
            if is_similar(msg_normalized, m[0].lower()):
                found_menu = m
                break

    # ==========================================
    # ⭐ 4. ระบบจำท็อปปิ้งเก่าข้ามประโยค (✨ ตัวแก้ปัญหา ✨)
    # ==========================================
    past_addons = []
    
    # ถ้าพิมพ์มาแค่ท็อปปิ้ง (หาเมนูใหม่ไม่เจอ) แต่มีเมนูเก่าค้างอยู่
    if not found_menu and last_menu and current_addons:
        found_menu = last_menu # ดึงเมนูเดิมมาใช้
        
        # ไปค้นดูว่าในข้อความล่าสุดของบอท มีท็อปปิ้งอะไรติดมาด้วยไหม
        if last_bot_msg:
            if "ไข่ดาว" in last_bot_msg and "ไข่ดาว" not in current_addons:
                past_addons.append("ไข่ดาว")
            if "ไข่เจียว" in last_bot_msg and "ไข่เจียว" not in current_addons:
                past_addons.append("ไข่เจียว")
            if "พิเศษ" in last_bot_msg and "พิเศษ" not in current_addons:
                past_addons.append("พิเศษ")

    # รวมท็อปปิ้งเก่าจากข้อความที่แล้ว + ท็อปปิ้งใหม่จากข้อความนี้ เข้าด้วยกัน
    all_addons = past_addons + current_addons
    
    # คำนวณราคารวมท็อปปิ้งจากฐานข้อมูล
    addon_price = 0
    valid_addons = []
    if found_menu and all_addons:
        options = get_menu_options_by_name(found_menu[0])
        option_dict = {opt['option_name']: float(opt['extra_price']) for opt in options}
        
        for addon in all_addons:
            if addon in option_dict:
                price = option_dict[addon]
                addon_price += price
                valid_addons.append(f"{addon}(+{price:g})")
            else:
                # ถ้าไม่เจอในฐานข้อมูล อาจจะกำหนดให้เป็น 10 บาทโดยปริยาย
                addon_price += 10
                valid_addons.append(f"{addon}(+10)")
        
        addon_text = f" + {' + '.join(valid_addons)}"
    else:
        # ถ้าหาเมนูไม่เจอ (แต่มีท็อปปิ้งติดมา) เผื่อไว้
        addon_price = len(all_addons) * 10
        addon_text = f" + {' + '.join(all_addons)}" if all_addons else ""

    # ⭐ อัปเดตเรื่องคิว
    if "update" in intents:
        if "คิว" in last_bot_msg or "คิว" in last_user_msg:
            if "queue" not in intents:
                intents.append("queue")

    responses = []

    # ==========================================
    # 🔥 5. สร้างคำตอบ
    # ==========================================
    if "greeting" in intents:
        responses.append(random.choice([
            "สวัสดีครับ! 🙏 น้องบอทยินดีให้บริการ มีอะไรให้ช่วยเหลือไหมครับ?",
            "สวัสดีจ้า~ 😊 วันนี้อยากทานอะไรดีครับ หรืออยากสอบถามคิว/โต๊ะว่าง บอกได้เลยนะครับ",
            "ดีครับผม! หิวหรือยังเอ่ย ถามเมนูอาหารหรือเช็คคิวได้เลยนะครับ 🍽️"
        ]))

    if "thanks" in intents:
        responses.append(random.choice([
            "ยินดีครับ! ถ้ามีคำถามอะไรเพิ่มเติม ทักมาได้ตลอดเลยนะครับ 😊",
            "ด้วยความยินดีครับผม 🙏",
            "โอเคครับ! ขอให้อร่อยกับมื้ออาหารนะครับ 🍽️"
        ]))

    if "recommend" in intents or "menu" in intents:
        recom = "\n".join(get_recommended())
        if "recommend" in intents:
            prefix = random.choice(["เมนูแนะนำยอดฮิต:\n", "แนะนำเป็นเมนูขายดีเหล่านี้เลยครับ:\n", "ร้านเราขอแนะนำ:\n"])
        else:
            prefix = "เมนูร้านเรามีเยอะมาก ขอแนะนำเป็นเมนูยอดฮิตก่อนนะครับ 🍽️\n"
        responses.append(f"{prefix}{recom}")

    if "queue" in intents:
        q = get_queue()
        if q == 0:
            responses.append(random.choice(["คิวว่างครับ", "ไม่มีคิวครับ", "คิวว่าง เข้ามาได้เลย"]))
        else:
            responses.append(random.choice([f"ตอนนี้มี {q} คิวครับ", f"ล่าสุดอยู่ที่ {q} คิวครับ"]))

    if "shop_open" in intents:
        if is_shop_open():
            responses.append(random.choice(["ร้านเปิด 🟢", "เปิดครับ 🟢"]))
        else:
            o_time = get_open_time()
            responses.append(random.choice([
                f"ร้านปิด 🔴 จะเปิดให้บริการอีกครั้งเวลา {o_time} น. ครับ", 
                f"ตอนนี้ปิดแล้วครับ 🔴 เปิดอีกที {o_time} น. นะครับ"
            ]))

    if "close_time" in intents:
        c_time = get_close_time()
        responses.append(random.choice([f"ร้านปิด {c_time} น. ครับ", f"ปิดตอน {c_time} ครับ"]))

    if "shop_address" in intents:
        shop_info = get_shop_info()
        if shop_info:
            addr = shop_info.get('address', 'ไม่ระบุ')
            lat = shop_info.get('latitude')
            lon = shop_info.get('longitude')
            if lat and lon:
                map_url = f"https://maps.google.com/?q={lat},{lon}"
                responses.append(f"📍 {addr}\n🗺️ แผนที่นำทาง: {map_url}")
            elif addr != 'ไม่ระบุ':
                responses.append(f"ร้านตั้งอยู่ที่: {addr} ครับ")

    if "table" in intents:
        free_tables = get_free_tables()
        if free_tables:
            tables_str = ", ".join(free_tables)
            responses.append(f"โต๊ะว่าง: {tables_str}")
        else:
            responses.append("โต๊ะเต็มครับ ตอนนี้เต็มหมดเลย")

    # 🔥 ตอบเรื่องเมนู (ราคา + ท็อปปิ้ง + สถานะ)
    if found_menu:
        is_out = found_menu[2]
        total_price = float(found_menu[1]) + float(addon_price)
        display_name = f"{found_menu[0]}{addon_text}"
        
        status_text = "หมดแล้วครับ ❌" if is_out else "ยังมีครับ สั่งได้เลย ✅"

        if "sold_out" in intents:
            menu_reply = f"{display_name} {status_text}"
        else:
            menu_reply = f"{display_name} ราคา รวม {total_price:.2f} บาท ({status_text})"

        if not any(found_menu[0] in r for r in responses): 
            responses.append(menu_reply)

    if not responses:
        if "unknown" in intents:
            reply = random.choice([
                "ขออภัยครับ น้องบอทยังไม่ค่อยเข้าใจคำถาม 😅\nแต่ถ้าเป็นเรื่อง 📌 เมนูอาหาร 📌 ราคา 📌 คิว 📌 โต๊ะว่าง หรือ 📌 พิกัดร้าน ถามมาได้เลยครับ!",
                "น้องบอทอาจจะยังเรียนรู้ไม่ครบทุกคำ 🥺 พิมพ์ถามเรื่อง 'เมนู', 'ราคา', 'คิว', 'โต๊ะ' หรือ 'ร้านปิดกี่โมง' ได้เลยนะครับ",
                "เอ๊ะ น้องบอทงงนิดหน่อยครับ 😅 ลองถามใหม่เป็นคำสั้นๆ เช่น 'ดูเมนู' หรือ 'คิวว่างไหม' ดูนะครับ"
            ])
        else:
            reply = "รับทราบครับ 😊 มีอะไรให้ช่วยเพิ่มบอกได้เลยนะครับ"
    else:
        reply = "\n\n".join(responses)

    save_chat(user_id, msg, reply)
    return reply