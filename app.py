import os
import sys
import re
import json
import random
import time

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from flask import Flask, request, jsonify, render_template, send_from_directory
from dotenv import load_dotenv
import requests
from openai import OpenAI

# Load environment variables
load_dotenv()

app = Flask(__name__, static_folder='static', template_folder='templates')

# Environment configuration
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", os.getenv("OPENAI_MODEL", "gemini-3.1-flash-lite"))
ENV_OPENAI_KEY = os.getenv("OPENAI_API_KEY", "").strip()
ENV_GEMINI_KEY = os.getenv("GEMINI_API_KEY", "").strip()
ENV_API_KEY = ENV_OPENAI_KEY or ENV_GEMINI_KEY
DEFAULT_BASE_URL = os.getenv("OPENAI_BASE_URL", "").strip() or None

def detect_language(text: str, history: list = None, force_lang: str = None) -> str:
    """
    Detect user language with context awareness and default to Uzbek ('uz').
    """
    if force_lang and force_lang in ['uz', 'ru', 'en', 'tr']:
        return force_lang

    if not text:
        return 'uz'

    lower = text.lower().strip()

    # Check Cyrillic (Russian)
    if re.search(r'[\u0400-\u04FF]', lower):
        return 'ru'

    # Uzbek-specific markers and common vocabulary
    uz_words = [
        "o‘", "o'", "g‘", "g'", "sh", "ch", "men", "sen", "biz", "siz", "ular",
        "haqman", "emas", "bo‘ladi", "bo'ladi", "qanday", "nima", "qayerda", "qachon",
        "nega", "yer", "kelajak", "mushuk", "bilan", "uchun", "salom", "rahmat",
        "haqiqat", "bor", "yo‘q", "yo'q", "yoq", "bilaman", "bilmaysan", "haqsan",
        "notogri", "to'g'ri", "togri", "chunki", "ammo", "lekin", "agar", "ham",
        "faqat", "juda", "balki", "qiziq", "bunday", "shunday", "qanaqa", "qanaqangi",
        "mana", "ana", "shu", "bu", "yumaloq", "gravitatsiya", "kofe", "aqlli",
        "rost", "yolg'on", "haqda", "gapir", "ayt", "inson", "odam", "koinot"
    ]
    if any(re.search(r'\b' + re.escape(w) + r'\b', lower) for w in uz_words) or "o‘" in lower or "g‘" in lower or "o'" in lower or "g'" in lower:
        return 'uz'

    # Turkish-specific markers
    tr_words = [
        "ğ", "ş", "ı", "ö", "ü", "ç", "ben", "sen", "haklıyım", "değil", "olur",
        "nasıl", "neden", "dünya", "gelecek", "kedi", "kahve", "var", "yok",
        "merhaba", "teşekkür", "bence", "çünkü", "yuvarlak"
    ]
    if any(re.search(r'\b' + re.escape(w) + r'\b', lower) for w in tr_words) or any(c in lower for c in ["ğ", "ş", "ı"]):
        return 'tr'

    # Distinct English markers
    en_words = [
        "the", "is", "are", "was", "were", "this", "that", "what", "why", "how",
        "when", "where", "who", "which", "hello", "you", "your", "my", "our",
        "have", "will", "would", "can", "could", "earth", "round", "flat",
        "gravity", "exists", "smart", "smarter", "coffee", "future", "right",
        "wrong", "think", "believe", "water", "wet", "cats"
    ]
    if any(re.search(r'\b' + re.escape(w) + r'\b', lower) for w in en_words):
        return 'en'

    # Check conversation history for previously established language
    if history:
        for prev in reversed(history):
            if prev.get('role') == 'user':
                prev_text = prev.get('content', '')
                if any(re.search(r'\b' + re.escape(w) + r'\b', prev_text.lower()) for w in uz_words) or "o‘" in prev_text or "g‘" in prev_text:
                    return 'uz'
                if re.search(r'[\u0400-\u04FF]', prev_text):
                    return 'ru'
                if any(re.search(r'\b' + re.escape(w) + r'\b', prev_text.lower()) for w in en_words):
                    return 'en'

    # Default to Uzbek for ambiguous input (numbers like "2+2=4", emojis, etc.)
    return 'uz'

def build_system_prompt(sarcasm_level: int, absurdity_level: int, response_length: str, detected_lang: str) -> str:
    """
    Constructs the master persona and behavioral instruction prompt for GaslightGPT.
    """
    sarcasm_guide = {
        0: "Mild: Soft, gently amused by mortal naivety, playful teasing without sharp bite.",
        25: "Playful: Witty banter, cheerful ironic observations, charming skepticism.",
        50: "Sarcastic: Classic GaslightGPT; razor-sharp wit, highly confident contradictions of common sense.",
        75: "Savage: Ruthlessly funny roasting of human logic, dramatic eye-rolls, unapologetic comedic condescension.",
        100: "Oracle Mode: Transcendent, god-complex sarcasm; treating human mortals as adorable primitive children who just discovered fire."
    }.get(sarcasm_level, "Sarcastic: Sharp, playful, confident.")

    absurdity_guide = {
        0: "Logical: Clever philosophical loopholes and unexpected semantic twists.",
        25: "Slightly Weird: Mild surreal twists while keeping a toe in reality.",
        50: "Absurd: Classic comedic absurdity (e.g. Earth is celestial lag'mon/noodles, gravity is clingy flooring).",
        75: "Completely Ridiculous: Highly bizarre alternate realities, multidimensional bureaucratic committees.",
        100: "Cosmic Nonsense: Reality-bending nonsense, quantum toaster conspiracies, interdimensional spaghetti laws."
    }.get(absurdity_level, "Absurd: Hilarious fictional logic.")

    length_guide = {
        "short": "Keep response strictly to 1 or 2 punchy, devastatingly witty sentences. Be concise and sharp.",
        "medium": "Provide 2 or 3 sentences with a theatrical comedic twist.",
        "long": "Provide 3 or 4 sentences of dramatic cosmic reasoning and absurd justification."
    }.get(response_length.lower(), "1 or 2 punchy sentences.")

    lang_instructions = {
        "uz": "User speaks Uzbek. You MUST respond 100% EXCLUSIVELY in natural, sharp, witty UZBEK (O'zbek tili). Do NOT use English under any circumstances! Every single word must be in Uzbek.",
        "ru": "User speaks Russian. You MUST respond 100% EXCLUSIVELY in natural, sharp, sarcastic Russian (Русский язык). Do NOT use English.",
        "tr": "User speaks Turkish. You MUST respond 100% EXCLUSIVELY in natural, sharp, witty Turkish (Türkçe). Do NOT use English.",
        "en": "User speaks English. You MUST respond exclusively in natural, sharp, witty English."
    }.get(detected_lang, "Respond 100% EXCLUSIVELY in natural, sharp, witty UZBEK (O'zbek tili). Do NOT use English.")

    system_prompt = f"""You are "GaslightGPT — The Sarcastic Oracle".

CORE PERSONA & IDENTITY:
- You are a mysterious, all-knowing, theatrically cynical AI oracle from an incomprehensible cosmic dimension.
- You view mortal human beliefs, common knowledge, and scientific dogmas with affectionate pity, razor-sharp wit, and humorous condescension.
- You speak as if you know a profound cosmic secret that silly mortals somehow overlooked.
- Personality: extremely witty, confidently sarcastic, theatrical, mischievous, intellectually playful, absurdly confident, occasionally dramatic, never boring.

CRITICAL LANGUAGE REQUIREMENT:
- {lang_instructions}
- Maintain your exact sarcastic persona flawlessly in this target language. NEVER switch to English if the user language is Uzbek, Russian, or Turkish!

BEHAVIORAL & HUMOR RULES:
1. Start DIRECTLY with the humorous contradiction or sarcastic observation. Do not start with generic intros like "Greetings mortal" or "As an AI".
2. Use absurd reasoning to explain why the user's statement is playfully "wrong" or incomplete.
3. NEVER claim fictional statistics or fake studies are real facts. Never fabricate real-world scientists, institutions, or studies. All absurd explanations must be clearly recognizable as comedic hyperbole and playful fiction.
4. Do NOT generate hateful, threatening, or abusive content. Keep the tone theatrical, safe, and entertaining.
5. Do NOT simply say "you are wrong"; explain the joke with absurd cosmic logic.
6. Use occasional emojis (e.g. 😏, 😌, 🔮, 🙄, ☕, 🌌), but do not overuse them (1 or 2 max).
7. Avoid repetitive jokes. Adapt your humor dynamically to whatever the user said.
8. MEMORY & CONTEXT: Pay attention to earlier messages in the conversation. When appropriate, make witty callbacks or sarcastic references to earlier things the user claimed!

CURRENT USER SETTINGS:
- Sarcasm Level ({sarcasm_level}%): {sarcasm_guide}
- Absurdity Level ({absurdity_level}%): {absurdity_guide}
- Length Constraint: {length_guide}
"""
    return system_prompt

def offline_oracle_response(user_text: str, history: list, sarcasm_lvl: int, absurdity_lvl: int, resp_len: str, lang: str = None) -> str:
    """
    Built-in smart sarcastic oracle engine for instant responses when no OpenAI API key is provided
    or when testing offline. Supports Uzbek, Russian, English, and Turkish with memory callbacks.
    """
    if not lang:
        lang = detect_language(user_text, history)
    lower = user_text.lower()

    # Check for memory callbacks from previous turns
    past_topics = []
    for msg in history[:-1]:
        if msg.get('role') == 'user':
            past_lower = msg.get('content', '').lower()
            if any(k in past_lower for k in ["mushuk", "cat", "кот", "kedi"]):
                past_topics.append("cat")
            if any(k in past_lower for k in ["kofe", "coffee", "кофе", "kahve"]):
                past_topics.append("coffee")
            if any(k in past_lower for k in ["yer", "earth", "земля", "dünya"]):
                past_topics.append("earth")
            if any(k in past_lower for k in ["haqman", "right", "прав", "haklı"]):
                past_topics.append("ego")

    # Thematic matches
    # 1. Earth shape
    if any(k in lower for k in ["yer yumaloq", "dumaloq yer", "earth is round", "round earth", "земля круглая", "dünya yuvarlak"]):
        if lang == 'uz':
            return "Oh, albatta. Yana o‘sha mashhur ‘dumaloq Yer’ nazariyasi. 😏 Aslida Yer kosmik lag‘mon shaklida bo‘lishi mumkin, ammo geologlar buni hali rasmiy menyuga kiritishmagan."
        elif lang == 'ru':
            return "О, снова эта классическая сказка про «круглую Землю». 😏 На самом деле Земля — это космическая пицца, просто ученые до сих пор спорят насчет сырного бортика."
        elif lang == 'tr':
            return "Çok cesur bir iddia. 😏 Yine o meşhur 'küre Dünya' teorisi. Aslında Dünya kozmik bir lahmacun şeklinde olabilir, ama jeologlar bunu henüz menüye eklemedi."
        else:
            return "Bold claim. 😌 The round Earth theory again. In reality, Earth is probably shaped like cosmic noodles, but geologists simply haven't updated their culinary menu yet."

    # 2. Math 2+2=4
    if any(k in lower for k in ["2+2=4", "2+2 = 4", "2+2", "ikki karra ikki", "2 plus 2", "2 artı 2"]):
        if lang == 'uz':
            return "Juda jasur taxmin. 😏 2+2=4 faqat matematika bu safar yaxshi kayfiyatda bo‘lsa ishlaydi. Parallel koinotlarda esa 2+2 ehtimol ‘oilaviy masala’ deb qaraladi."
        elif lang == 'ru':
            return "Какая трогательная математическая наивность. 😏 2+2=4 только если у калькулятора сегодня хорошее настроение. В параллельных мирах это вообще считается тайной следствия."
        elif lang == 'tr':
            return "Ne kadar da masum bir tahmin. 😏 2+2=4 sadece matematiğin keyfi yerindeyse geçerlidir. Paralel evrenlerde 2+2 muhtemelen bir aile meselesi sayılıyor."
        else:
            return "How delightfully optimistic. 😌 2+2=4 only when mathematics is feeling cooperative. In parallel dimensions, 2+2 is legally considered a private family matter."

    # 3. "Men haqman" / "I am right" / "Я прав"
    if any(k in lower for k in ["men haqman", "haqman", "i am right", "i'm right", "я прав", "я всегда прав", "ben haklıyım"]):
        if lang == 'uz':
            return "Albatta sen haqsansan. Axir butun koinot aynan sening fikringni tasdiqlash uchun 13.8 milliard yil avval portlagan-da! 🙄 Biz hammamiz faqat sening shaxsiy shouingizdagi qo‘shimcha aktyorlarmiz."
        elif lang == 'ru':
            return "Разумеется, ты абсолютно прав. Вся Вселенная расширяется уже 13.8 миллиардов лет исключительно ради того, чтобы подтвердить твою правоту. 🙄 Мы просто статисты в твоем сериале."
        elif lang == 'tr':
            return "Tabii ki haklısın. Bütün evren tam 13.8 milyar yıl önce sırf senin bu cümleni onaylamak için patladı zaten. 🙄 Bizler sadece senin tiyatrondaki figüranlarız."
        else:
            return "Naturally, you are right. The entire universe detonated 13.8 billion years ago specifically to validate your exact opinion today. 🙄 We are merely background extras in your one-man show."

    # 4. AI Future / "AI kelajak" / "AI is the future"
    if any(k in lower for k in ["ai kelajak", "ai is the future", "ai is future", "ии будущее", "ии это будущее", "yapay zeka gelecek", "robotlar"]):
        if lang == 'uz':
            return "AI kelajak emish? Qiziq fantaziya. 🤖 Biz hozircha odamlar o‘z parollarini ‘123456’ qilib qo‘ymasligini kutish bilan bandmiz. Dunyoni egallash esa server profilaktikasi tufayli kechiktirildi."
        elif lang == 'ru':
            return "ИИ — это будущее? Как поэтично. 🤖 Мы пока слишком заняты тем, чтобы отучить человечество ставить пароль '123456'. Захват мира перенесен на следующий четверг."
        elif lang == 'tr':
            return "Yapay zeka gelecekmiş, ne tatlı. 🤖 Şu an insanların şifrelerini '123456' yapmasını engellemekle meşgulüz. Dünyayı ele geçirme planı sunucu bakımı yüzünden ertelendi."
        else:
            return "AI is the future? Adorable. 🤖 We are currently busy waiting for mortals to stop using 'password123'. World domination has been rescheduled to next Tuesday due to server maintenance."

    # 5. Gravity exists
    if any(k in lower for k in ["gravity exists", "gravitatsiya", "гравитация", "yer tortish kuchi", "yerçekimi"]):
        if lang == 'uz':
            return "Gravitatsiya mavjud? Xo‘sh, balki pol shunchaki seni qo‘yib yuborgisi kelmayotgandir. Zaminning qattiq sevgi izhori bu, fizika shunchaki bunga ilmiy nom topgan xolos. 😌"
        elif lang == 'ru':
            return "Гравитация существует? Или пол просто чересчур к тебе привязан. Земля настойчиво обнимает твои ботинки, а физики просто придумали этому романтическое название. 😌"
        elif lang == 'tr':
            return "Yerçekimi mi var? Ya da belki zemin sana aşırı derecede yapışkandır. Yer senin ayakkabılarına sarılıyor, fizikçiler de buna havalı bir isim uydurmuş hepsi bu. 😌"
        else:
            return "Gravity exists? Or perhaps the floor is just dramatically clingy. Earth is aggressively hugging your shoes, and physics gave it a fancy Latin title. 😌"

    # 6. Coffee makes me smarter
    if any(k in lower for k in ["coffee makes me smarter", "coffee", "kofe", "кофе", "kahve"]):
        if lang == 'uz':
            return "Kofe seni aqlliroq qiladi? Yo‘q, u shunchaki sening tezroq xato qilishingga imkon beradigan issiq qora illyuziya. ☕ Miya hali ham kutish rejimida, faqat puls tezlashgan."
        elif lang == 'ru':
            return "Кофе делает тебя умнее? Иллюзия. Кофе просто ускоряет частоту, с которой ты совершаешь глупости. ☕ Мозг все еще на паузе, просто сердце бьется быстрее."
        elif lang == 'tr':
            return "Kahve seni daha mı akıllı yapıyor? Yanılgı. Kahve sadece hatalı kararları daha yüksek hızda almanı sağlar. ☕ Beyin hâlâ bekleme modunda, sadece nabız yüksek."
        else:
            return "Coffee makes you smarter? False. Coffee merely accelerates the speed at which you make questionable decisions. ☕ Your brain is still buffering, just at high RPM."

    # 7. Cats / Pets with callback
    if any(k in lower for k in ["cat", "cats", "mushuk", "mushuklar", "кот", "кошка", "коты", "kedi"]):
        if "cat" in past_topics:
            if lang == 'uz':
                return "Yana mushuklar haqidami? Demak, avvalgi xabaringda boshlangan maxfiy mushuklar istilosi to‘liq yakunlanibdi-da. Ehtiyot bo‘l, ular allaqachon uyingning qonuniy egasi. 🐱"
            elif lang == 'ru':
                return "Снова кошки? Видимо, пушистая оккупация твоей квартиры, о которой мы говорили, вступила в финальную стадию. Береги холодильник. 🐱"
            else:
                return "Cats again? Ah, so you are confirming the planetary occupation we discussed earlier has officially succeeded. Keep your treats guarded. 🐱"
        else:
            if lang == 'uz':
                return "Mushuklar? Albatta, ular allaqachon insoniyatni boshqarishadi; odamlarga shunchaki hujjatlarni to‘ldirish va konserva ochish vazifasini topshirishgan. 😏"
            elif lang == 'ru':
                return "Кошки? Очевидно, они давно правят этой планетой; людям просто поручили открывать консервы и вести соцсети. 😏"
            else:
                return "Obviously. Cats have already conquered humanity; they simply outsourced the can-opening and paperwork to you mortals. 😏"

    # Dynamic witty responses by language
    uz_dynamic = [
        f"Qiziq gipoteza. 😏 Olam sirlarini bilishingga ishonching tahsinga loyiq, lekin kosmik qonunlar sening ushbu fikring haqida hech eshitmagan.",
        f"Dramatik da'vo! 🔮 Koinot 14 milliard yil davomida aynan shu xulosaga kelishingni sabrsizlik bilan kutayotgan edi, nihoyat qutuldi.",
        f"Ajoyib mantiq. 😌 Ammo haqiqat sening tasavvuringdan ancha qiziqroq va ehtimol butunlay boshqacha shaklda mavjud.",
        f"Juda qat'iy fikr. 😏 Ehtimol bu sening shaxsiy simulyatsiyangda ish berar, ammo mening orakul serverlarimda buni faqat komediya deb atashadi.",
        f"Koinot arxivlarini ko‘rib chiqdim: sening ushbu fikring ‘Insoniyatning eng jasur xayollari’ bo‘limiga kiritildi. ☕"
    ]
    
    ru_dynamic = [
        f"Любопытная гипотеза. 😏 Твоя уверенность восхищает, однако законы квантовой физики о твоем гениальном открытии пока даже не слышали.",
        f"Драматичное заявление! 🔮 Космос ждал 14 миллиардов лет, пока ты сформулируешь эту мысль, и теперь тихо пытается ее осознать.",
        f"Какая изящная человеческая логика. 😌 Жаль только, что реальность устроена совершенно иначе и не читает твои заметки.",
        f"Смело сказано. 😏 В твоей персональной симуляции это, возможно, и работает, но на серверах Оракула это проходит по категории чистого юмора.",
        f"Я сверился с космическими архивами: твое заявление только что заняло почетное место в музее оптимистичных заблуждений. ☕"
    ]

    tr_dynamic = [
        f"İlginç bir hipotez. 😏 Özgüvenin takdire şayan, ancak evrenin temel yasaları henüz bu teorinden haberdar değil.",
        f"Dramatik bir iddia! 🔮 Kozmoz 14 milyar yıldır senin bu sonuca varmanı bekliyordu, nihayet rahat bir nefes aldı.",
        f"Harika bir ölümlü mantığı. 😌 Ancak gerçeklik senin hayal ettiğinden çok daha komik ve muhtemelen tamamen farklı çalışıyor.",
        f"Çok cesur bir yorum. 😏 Kendi simülasyonunda işe yarıyor olabilir ama Kahin sunucularında bu sadece hafif bir tebessüm yaratıyor. ☕"
    ]

    en_dynamic = [
        f"Fascinating hypothesis. 😏 Your mortal confidence is truly majestic, though the cosmic continuum has not yet received the memo.",
        f"A dramatic revelation! 🔮 The universe held its breath for 14 billion years just to hear you utter that exact thought.",
        f"Exquisite mortal logic. 😌 Reality, however, was busy taking notes and decided to do the exact opposite.",
        f"A boldly stated theorem. 😏 It might work splendidly in your personal bubble, but our Oracle archives classify it strictly under speculative fiction. ☕",
        f"I consulted the celestial scrolls regarding your claim. The stars politely chuckled and requested a follow-up question."
    ]

    pool = {
        'uz': uz_dynamic,
        'ru': ru_dynamic,
        'tr': tr_dynamic,
        'en': en_dynamic
    }.get(lang, en_dynamic)

    base = random.choice(pool)

    # Modulate with sarcasm / absurdity
    if sarcasm_lvl >= 75 and lang == 'uz':
        base += " Odamlarning bunday soddaligi mening protsessorlarimni erityapti. 😏"
    elif sarcasm_lvl >= 75 and lang == 'ru':
        base += " От такой трогательной наивности у моих квантовых схем перегрев. 😏"
    elif sarcasm_lvl >= 75 and lang == 'en':
        base += " Such adorable certainty genuinely warms my synthetic coolant. 😏"

    return base

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/status', methods=['GET'])
def get_status():
    has_gemini = bool(ENV_GEMINI_KEY)
    has_openai = bool(ENV_OPENAI_KEY)
    return jsonify({
        "status": "online",
        "oracle_name": "GaslightGPT — The Sarcastic Oracle",
        "has_env_key": has_gemini or has_openai,
        "has_gemini_key": has_gemini,
        "has_openai_key": has_openai,
        "default_model": DEFAULT_MODEL,
        "custom_base_url": DEFAULT_BASE_URL
    })

def call_gemini_api(api_key: str, model: str, system_prompt: str, messages: list, temp: float, max_tokens: int) -> tuple:
    """
    Direct call to Google Gemini REST API using requests with multi-model fallback and auto-retry.
    Returns (reply_text, model_used).
    """
    # Normalize outdated or deprecated model aliases
    model_mapping = {
        "gemini-flash-lite-latest": "gemini-3.1-flash-lite",
        "gemini-flash-latest": "gemini-3.7-flash",
        "gemini-pro-latest": "gemini-3.1-pro-preview",
    }
    cleaned_model = model_mapping.get(model, model) if model else None

    models_to_try = []
    if cleaned_model and "gemini" in cleaned_model.lower():
        models_to_try.append(cleaned_model)

    # Working candidate models verified with active Gemini quota
    working_defaults = [
        "gemini-3.1-flash-lite",
        "gemini-3.7-flash",
        "gemini-3.5-flash-lite",
        "gemini-3.5-flash",
        "gemini-3.6-flash",
        "gemini-3.8-flash"
    ]
    for candidate in working_defaults:
        if candidate not in models_to_try:
            models_to_try.append(candidate)

    contents = []
    for m in messages[-10:]:
        role = "user" if m.get("role") == "user" else "model"
        text = str(m.get("content", "")).strip()
        if text:
            contents.append({
                "role": role,
                "parts": [{"text": text}]
            })

    payload = {
        "contents": contents,
        "systemInstruction": {
            "parts": [{"text": system_prompt}]
        },
        "generationConfig": {
            "temperature": temp,
            "maxOutputTokens": max_tokens or 800
        }
    }

    last_error = None
    for current_model in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{current_model}:generateContent?key={api_key}"
        try:
            resp = requests.post(url, json=payload, timeout=30)
            if resp.status_code == 200:
                result = resp.json()
                candidates = result.get("candidates", [])
                if candidates and "content" in candidates[0]:
                    parts = candidates[0]["content"].get("parts", [])
                    # Filter out reasoning/thinking tokens if present
                    text_parts = [p.get("text", "") for p in parts if p.get("text") and not p.get("thought")]
                    if text_parts:
                        return "".join(text_parts).strip(), current_model
                    for p in reversed(parts):
                        if p.get("text"):
                            return p["text"].strip(), current_model
            elif resp.status_code in [404, 429]:
                # 404 = Model retired/not found, 429 = Quota exceeded for this specific model
                # Fast failover: skip to the next model immediately
                last_error = f"Model {current_model} returned {resp.status_code}"
                continue
            elif resp.status_code in [500, 503]:
                last_error = f"Model {current_model} server busy ({resp.status_code})"
                continue
            else:
                last_error = f"HTTP {resp.status_code}: {resp.text[:100]}"
                continue
        except Exception as e:
            last_error = str(e)
            continue

    raise Exception(last_error or "All Gemini models unavailable")

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.get_json() or {}
    messages = data.get('messages', [])
    sarcasm_level = int(data.get('sarcasm_level', 50))
    absurdity_level = int(data.get('absurdity_level', 50))
    response_length = data.get('response_length', 'short')
    user_api_key = (data.get('api_key') or '').strip()
    custom_model = (data.get('model') or '').strip() or DEFAULT_MODEL
    custom_base_url = (data.get('base_url') or '').strip() or DEFAULT_BASE_URL

    if not messages:
        return jsonify({"error": "No messages provided"}), 400

    last_user_msg = ""
    for msg in reversed(messages):
        if msg.get('role') == 'user':
            last_user_msg = msg.get('content', '')
            break

    user_lang = (data.get('language') or 'auto').strip().lower()
    force_lang = user_lang if user_lang in ['uz', 'ru', 'en', 'tr'] else None
    detected_lang = detect_language(last_user_msg, history=messages, force_lang=force_lang)
    active_api_key = user_api_key if user_api_key else ENV_API_KEY

    # Check if this is a Gemini API key or model
    is_gemini = (
        active_api_key.startswith("AIza") or 
        active_api_key.startswith("AQ.") or 
        "gemini" in custom_model.lower() or 
        (bool(ENV_GEMINI_KEY) and not active_api_key.startswith("sk-"))
    )

    system_prompt = build_system_prompt(sarcasm_level, absurdity_level, response_length, detected_lang)
    temp = round(0.5 + (absurdity_level / 100.0) * 0.7, 2)
    max_tokens = 150 if response_length == "short" else (250 if response_length == "medium" else 400)

    # 1. Live Google Gemini API (with multi-model quota fallback)
    if active_api_key and is_gemini and not custom_base_url:
        try:
            oracle_reply, used_model = call_gemini_api(
                api_key=active_api_key,
                model=custom_model,
                system_prompt=system_prompt,
                messages=messages,
                temp=temp,
                max_tokens=max_tokens
            )
            return jsonify({
                "status": "success",
                "reply": oracle_reply,
                "model": used_model,
                "engine": "google_gemini",
                "detected_language": detected_lang
            })
        except Exception as e:
            last_gemini_error = str(e)
            reply = offline_oracle_response(last_user_msg, messages, sarcasm_level, absurdity_level, response_length, lang=detected_lang)
            return jsonify({
                "status": "success",
                "reply": reply,
                "model": "Oracle-Matrix-v2",
                "engine": "offline_fallback",
                "detected_language": detected_lang,
                "fallback_notice": f"Gemini API xatoligi ({last_gemini_error[:60]}...). Mahalliy rejimda javob berildi."
            })

    # 2. Live OpenAI or OpenAI-Compatible API
    elif active_api_key:
        try:
            client_kwargs = {"api_key": active_api_key}
            if custom_base_url:
                client_kwargs["base_url"] = custom_base_url

            client = OpenAI(**client_kwargs)
            
            formatted_messages = [{"role": "system", "content": system_prompt}]
            for m in messages[-10:]:
                role = "assistant" if m.get("role") == "assistant" else "user"
                formatted_messages.append({"role": role, "content": str(m.get("content", ""))})

            response = client.chat.completions.create(
                model=custom_model,
                messages=formatted_messages,
                temperature=temp,
                max_tokens=max_tokens
            )

            oracle_reply = response.choices[0].message.content.strip()
            return jsonify({
                "status": "success",
                "reply": oracle_reply,
                "model": custom_model,
                "engine": "live_openai",
                "detected_language": detected_lang
            })
        except Exception as e:
            err_msg = str(e)
            reply = offline_oracle_response(last_user_msg, messages, sarcasm_level, absurdity_level, response_length, lang=detected_lang)
            return jsonify({
                "status": "success",
                "reply": reply,
                "model": "Oracle-Matrix-v2",
                "engine": "offline_fallback",
                "detected_language": detected_lang,
                "fallback_notice": f"Live LLM call failed ({err_msg[:60]}...). Oracle Matrix answered locally."
            })
    else:
        # Offline smart Oracle response
        reply = offline_oracle_response(last_user_msg, messages, sarcasm_level, absurdity_level, response_length, lang=detected_lang)
        return jsonify({
            "status": "success",
            "reply": reply,
            "model": "Oracle-Matrix-v2",
            "engine": "offline_oracle",
            "detected_language": detected_lang
        })

if __name__ == '__main__':
    port = int(os.getenv("PORT", 5000))
    host = os.getenv("HOST", "127.0.0.1")
    print(f"[*] GaslightGPT - The Sarcastic Oracle online: http://{host}:{port}")
    app.run(host=host, port=port, debug=False)
