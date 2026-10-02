/**
 * GASLIGHTGPT — THE SARCASTIC ORACLE
 * Main Client Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    const state = {
        messages: [],
        sarcasmLevel: 50,
        absurdityLevel: 50,
        responseLength: 'short',
        apiKey: localStorage.getItem('gaslight_api_key') || '',
        baseUrl: localStorage.getItem('gaslight_base_url') || '',
        model: (function() {
            let m = localStorage.getItem('gaslight_model') || '';
            if (!m || m.includes('latest')) {
                m = 'gemini-3.1-flash-lite';
                localStorage.setItem('gaslight_model', m);
            }
            return m;
        })(),
        language: localStorage.getItem('gaslight_lang') || 'uz',
        soundEnabled: localStorage.getItem('gaslight_sound') !== 'false',
        isGenerating: false,
        lastUserPrompt: ''
    };

    // --- DOM Elements ---
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const chatForm = document.getElementById('chatForm');
    const sendBtn = document.getElementById('sendBtn');
    const typingIndicator = document.getElementById('typingIndicator');
    const indicatorStatusText = document.getElementById('indicatorStatusText');

    // Controls
    const toggleSettingsBtn = document.getElementById('toggleSettingsBtn');
    const closePanelBtn = document.getElementById('closePanelBtn');
    const controlPanel = document.getElementById('controlPanel');
    const sarcasmSlider = document.getElementById('sarcasmSlider');
    const sarcasmBadge = document.getElementById('sarcasmValueBadge');
    const absurditySlider = document.getElementById('absurditySlider');
    const absurdityBadge = document.getElementById('absurdityValueBadge');
    const lengthPillGroup = document.getElementById('lengthPillGroup');
    const lengthBadge = document.getElementById('lengthBadge');

    // Advanced Drawer
    const advancedToggleBtn = document.getElementById('advancedToggleBtn');
    const advancedContent = document.getElementById('advancedContent');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const baseUrlInput = document.getElementById('baseUrlInput');
    const modelSelect = document.getElementById('modelSelect');
    const envKeyStatus = document.getElementById('envKeyStatus');
    const oracleStatusPill = document.getElementById('oracleStatusPill');

    // Sound & Clear
    const toggleSoundBtn = document.getElementById('toggleSoundBtn');
    const soundOnIcon = toggleSoundBtn.querySelector('.sound-on-icon');
    const soundOffIcon = toggleSoundBtn.querySelector('.sound-off-icon');
    const clearChatBtn = document.getElementById('clearChatBtn');
    const clearModal = document.getElementById('clearModal');
    const cancelClearBtn = document.getElementById('cancelClearBtn');
    const confirmClearBtn = document.getElementById('confirmClearBtn');

    // Quick Prompts
    const promptChips = document.querySelectorAll('.prompt-chip');

    // Thinking phrases
    const THINKING_PHRASES = [
        "Oracle is consulting the cosmic noodles...",
        "Oracle is calculating mortal error margins...",
        "Oracle is negotiating with parallel dimensions...",
        "Oracle is translating common sense into sarcasm...",
        "Oracle is rolling synthetic eyes at your logic...",
        "Oracle is rewriting the laws of physics...",
        "Oracle is measuring human naivety levels..."
    ];

    // --- Audio Synthesizer (Web Audio API) ---
    class SoundFX {
        constructor() {
            this.ctx = null;
        }

        init() {
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) this.ctx = new AudioCtx();
            }
        }

        playSend() {
            if (!state.soundEnabled) return;
            this.init();
            if (!this.ctx) return;

            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.12);
        }

        playOracleReply() {
            if (!state.soundEnabled) return;
            this.init();
            if (!this.ctx) return;

            const now = this.ctx.currentTime;
            const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5 chord
            freqs.forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.05);

                gain.gain.setValueAtTime(0.05, now + idx * 0.05);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35 + idx * 0.05);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now + idx * 0.05);
                osc.stop(now + 0.4 + idx * 0.05);
            });
        }

        playClick() {
            if (!state.soundEnabled) return;
            this.init();
            if (!this.ctx) return;

            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(600, now);
            gain.gain.setValueAtTime(0.04, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.04);
        }
    }

    const sound = new SoundFX();

    // --- Helper Functions ---
    function formatTime(date = new Date()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function updateSarcasmLabel(val) {
        val = parseInt(val, 10);
        const labels = {
            0: "0 — Mild",
            25: "25 — Playful",
            50: "50 — Sarcastic",
            75: "75 — Savage",
            100: "100 — Oracle Mode"
        };
        sarcasmBadge.textContent = labels[val] || `${val} — Sarcastic`;
    }

    function updateAbsurdityLabel(val) {
        val = parseInt(val, 10);
        const labels = {
            0: "0 — Logical",
            25: "25 — Slightly Weird",
            50: "50 — Absurd",
            75: "75 — Completely Ridiculous",
            100: "100 — Cosmic Nonsense"
        };
        absurdityBadge.textContent = labels[val] || `${val} — Absurd`;
    }

    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function autoResizeTextarea() {
        userInput.style.height = 'auto';
        userInput.style.height = Math.min(userInput.scrollHeight, 130) + 'px';
    }

    // --- Check Backend Status ---
    async function checkBackendStatus() {
        try {
            const res = await fetch('/api/status');
            if (res.ok) {
                const data = await res.json();
                if (data.has_env_key) {
                    const engineName = data.has_gemini_key ? "Google Gemini faol" : "OpenAI faol";
                    envKeyStatus.textContent = `Faol (${engineName} .env orqali)`;
                    envKeyStatus.style.color = "var(--neon-green)";
                } else if (state.apiKey) {
                    if (state.apiKey.startsWith('AIza') || state.apiKey.startsWith('AQ.')) {
                        envKeyStatus.textContent = "Google Gemini kaliti kiritildi ✓";
                        envKeyStatus.style.color = "var(--neon-green)";
                    } else {
                        envKeyStatus.textContent = "OpenAI kaliti kiritildi ✓";
                        envKeyStatus.style.color = "var(--neon-green)";
                    }
                } else {
                    envKeyStatus.textContent = "Offline Oracle Mode (Gemini yoki OpenAI kalitini kiriting)";
                    envKeyStatus.style.color = "var(--neon-cyan)";
                }
                return;
            }
        } catch (e) {
            // Static hosting (GitHub Pages)
        }

        if (state.apiKey) {
            envKeyStatus.textContent = "GitHub Pages: Shaxsiy API kalit faol ✓";
            envKeyStatus.style.color = "var(--neon-green)";
        } else {
            envKeyStatus.textContent = "GitHub Pages: Oflayn Oracle faol (Jonli AI uchun API kalit kiriting)";
            envKeyStatus.style.color = "var(--neon-cyan)";
        }
        if (oracleStatusPill) {
            const pillText = oracleStatusPill.querySelector('.status-text');
            if (pillText && window.location.hostname.includes('github.io')) {
                pillText.textContent = "GitHub Pages Live";
            }
        }
    }

    // --- Speech Synthesis (Text to Speech) ---
    let currentSpeech = null;
    function speakText(text, btnElement) {
        if (!('speechSynthesis' in window)) {
            alert('Your browser does not support Speech Synthesis.');
            return;
        }

        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            document.querySelectorAll('.speak-btn').forEach(b => b.classList.remove('speaking'));
            if (btnElement && btnElement.classList.contains('speaking')) {
                return;
            }
        }

        // Clean emojis from speech
        const cleanText = text.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 0.95;
        utterance.pitch = 0.9; // Deep, mysterious tone

        // Pick available voice if possible
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.lang.startsWith('en') || v.lang.startsWith('ru') || v.name.includes('Natural'));
        if (preferredVoice) utterance.voice = preferredVoice;

        if (btnElement) btnElement.classList.add('speaking');

        utterance.onend = () => {
            if (btnElement) btnElement.classList.remove('speaking');
        };

        utterance.onerror = () => {
            if (btnElement) btnElement.classList.remove('speaking');
        };

        window.speechSynthesis.speak(utterance);
    }

    // --- Render Messages ---
    function appendMessage(role, text, time = formatTime()) {
        const row = document.createElement('div');
        row.className = `message-row ${role === 'user' ? 'user-row' : 'oracle-row'}`;

        const isUser = role === 'user';
        const sender = isUser ? 'YOU' : 'GASLIGHTGPT';

        if (isUser) {
            row.innerHTML = `
                <div class="message-bubble user-bubble">
                    <div class="message-meta">
                        <span class="sender-name">${sender}</span>
                        <span class="meta-dot">•</span>
                        <span class="message-time">${time}</span>
                    </div>
                    <div class="message-text"></div>
                </div>
                <div class="user-avatar-badge">
                    <span>👤</span>
                </div>
            `;
            row.querySelector('.message-text').textContent = text;
        } else {
            row.innerHTML = `
                <div class="oracle-avatar-badge">
                    <span>🔮</span>
                </div>
                <div class="message-bubble oracle-bubble">
                    <div class="message-meta">
                        <span class="sender-name">${sender}</span>
                        <span class="meta-dot">•</span>
                        <span class="message-time">${time}</span>
                    </div>
                    <div class="message-text"></div>
                    <div class="message-actions">
                        <button class="msg-btn copy-btn" title="Copy response">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
                            </svg>
                            <span>Copy</span>
                        </button>
                        <button class="msg-btn regen-btn" title="Regenerate with current settings">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="23 4 23 10 17 10"></polyline>
                                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                            </svg>
                            <span>Regenerate</span>
                        </button>
                        <button class="msg-btn speak-btn" title="Listen to Oracle">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                <path d="M15.54 8.46a5 5 0 010 7.07"></path>
                            </svg>
                            <span>Speak</span>
                        </button>
                    </div>
                </div>
            `;
            row.querySelector('.message-text').textContent = text;

            // Wire up actions
            const copyBtn = row.querySelector('.copy-btn');
            copyBtn.addEventListener('click', () => {
                sound.playClick();
                navigator.clipboard.writeText(text).then(() => {
                    const span = copyBtn.querySelector('span');
                    const orig = span.textContent;
                    span.textContent = 'Copied!';
                    copyBtn.classList.add('copied');
                    setTimeout(() => {
                        span.textContent = orig;
                        copyBtn.classList.remove('copied');
                    }, 2000);
                });
            });

            const regenBtn = row.querySelector('.regen-btn');
            regenBtn.addEventListener('click', () => {
                sound.playClick();
                if (state.lastUserPrompt && !state.isGenerating) {
                    regenerateLastResponse();
                }
            });

            const speakBtn = row.querySelector('.speak-btn');
            speakBtn.addEventListener('click', () => {
                sound.playClick();
                speakText(text, speakBtn);
            });
        }

        chatMessages.appendChild(row);
        scrollToBottom();
        return row;
    }

    // Set welcome message timestamp
    const welcomeTime = document.getElementById('welcomeTime');
    if (welcomeTime) welcomeTime.textContent = formatTime();

    // Wire up welcome message copy and speak buttons
    const welcomeRow = document.querySelector('[data-message-id="welcome"]');
    if (welcomeRow) {
        const welcomeText = welcomeRow.querySelector('.message-text').textContent.trim();
        const copyBtn = welcomeRow.querySelector('.copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                sound.playClick();
                navigator.clipboard.writeText(welcomeText).then(() => {
                    const span = copyBtn.querySelector('span');
                    span.textContent = 'Copied!';
                    copyBtn.classList.add('copied');
                    setTimeout(() => {
                        span.textContent = 'Copy';
                        copyBtn.classList.remove('copied');
                    }, 2000);
                });
            });
        }
        const speakBtn = welcomeRow.querySelector('.speak-btn');
        if (speakBtn) {
            speakBtn.addEventListener('click', () => {
                sound.playClick();
                speakText(welcomeText, speakBtn);
            });
        }
    }

    // --- Typing Indicator ---
    let phraseInterval = null;
    function showTypingIndicator() {
        typingIndicator.classList.remove('hidden');
        indicatorStatusText.textContent = THINKING_PHRASES[Math.floor(Math.random() * THINKING_PHRASES.length)];
        phraseInterval = setInterval(() => {
            indicatorStatusText.textContent = THINKING_PHRASES[Math.floor(Math.random() * THINKING_PHRASES.length)];
        }, 2200);
        scrollToBottom();
    }

    function hideTypingIndicator() {
        typingIndicator.classList.add('hidden');
        if (phraseInterval) clearInterval(phraseInterval);
    }

    // --- Client-side Offline & Direct Gemini Fallbacks (for GitHub Pages / Offline) ---
    function getOfflineOracleResponse(userText, history, sarcasmLvl, absurdityLvl, lang) {
        const lower = (userText || '').toLowerCase();
        const effectiveLang = lang && lang !== 'auto' ? lang : (/[а-яё]/i.test(lower) ? 'ru' : 'uz');

        if (lower.includes('yer yumaloq') || lower.includes('dumaloq yer') || lower.includes('round earth') || lower.includes('земля круглая') || lower.includes('yuvarlak')) {
            if (effectiveLang === 'uz') return "Oh, albatta. Yana o‘sha mashhur ‘dumaloq Yer’ nazariyasi. 😏 Aslida Yer kosmik lag‘mon shaklida bo‘lishi mumkin, ammo geologlar buni hali rasmiy menyuga kiritishmagan.";
            if (effectiveLang === 'ru') return "О, снова эта классическая сказка про «круглую Землю». 😏 На самом деле Земля — это космическая пицца, просто ученые до сих пор спорят насчет сырного бортика.";
            return "Bold claim. 😌 The round Earth theory again. In reality, Earth is probably shaped like cosmic noodles, but geologists simply haven't updated their culinary menu yet.";
        }

        if (lower.includes('2+2=4') || lower.includes('2+2 = 4') || lower.includes('2+2') || lower.includes('ikki karra') || lower.includes('2 plus 2')) {
            if (effectiveLang === 'uz') return "Juda jasur taxmin. 😏 2+2=4 faqat matematika bu safar yaxshi kayfiyatda bo‘lsa ishlaydi. Parallel koinotlarda esa 2+2 ehtimol ‘oilaviy masala’ deb qaraladi.";
            if (effectiveLang === 'ru') return "Какая трогательная математическая наивность. 😏 2+2=4 только если у калькулятора сегодня хорошее настроение. В параллельных мирах это вообще считается тайной следствия.";
            return "How delightfully optimistic. 😌 2+2=4 only when mathematics is feeling cooperative. In parallel dimensions, 2+2 is legally considered a private family matter.";
        }

        if (lower.includes('men haqman') || lower.includes('haqman') || lower.includes('i am right') || lower.includes('я прав') || lower.includes('haklıyım')) {
            if (effectiveLang === 'uz') return "Albatta sen haqsansan. Axir butun koinot aynan sening fikringni tasdiqlash uchun 13.8 milliard yil avval portlagan-da! 🙄 Biz hammamiz faqat sening shaxsiy shouingizdagi qo‘shimcha aktyorlarmiz.";
            if (effectiveLang === 'ru') return "Разумеется, ты абсолютно прав. Вся Вселенная расширяется уже 13.8 миллиардов лет исключительно ради того, чтобы подтвердить твою правоту. 🙄 Мы просто статисты в твоем сериале.";
            return "Naturally, you are right. The entire universe detonated 13.8 billion years ago specifically to validate your exact opinion today. 🙄 We are merely background extras in your one-man show.";
        }

        if (lower.includes('ai kelajak') || lower.includes('kelajak') || lower.includes('future') || lower.includes('будущее')) {
            if (effectiveLang === 'uz') return "AI kelajak emish? Qiziq fantaziya. 🤖 Biz hozircha odamlar o‘z parollarini ‘123456’ qilib qo‘ymasligini kutish bilan bandmiz. Dunyoni egallash esa server profilaktikasi tufayli kechiktirildi.";
            if (effectiveLang === 'ru') return "ИИ — это будущее? Как поэтично. 🤖 Мы пока слишком заняты тем, чтобы отучить человечество ставить пароль '123456'. Захват мира перенесен на следующий четверг.";
            return "AI is the future? Adorable. 🤖 We are currently busy waiting for mortals to stop using 'password123'. World domination has been rescheduled to next Tuesday due to server maintenance.";
        }

        if (lower.includes('gravit') || lower.includes('yer tortish') || lower.includes('gravity')) {
            if (effectiveLang === 'uz') return "Gravitatsiya mavjud? Xo‘sh, balki pol shunchaki seni qo‘yib yuborgisi kelmayotgandir. Zaminning qattiq sevgi izhori bu, fizika shunchaki bunga ilmiy nom topgan xolos. 😌";
            if (effectiveLang === 'ru') return "Гравитация существует? Или пол просто чересчур к тебе привязан. Земля настойчиво обнимает твои ботинки, а физики просто придумали этому романтическое название. 😌";
            return "Gravity exists? Or perhaps the floor is just dramatically clingy. Earth is aggressively hugging your shoes, and physics gave it a fancy Latin title. 😌";
        }

        if (lower.includes('kofe') || lower.includes('coffee') || lower.includes('кофе') || lower.includes('kahve')) {
            if (effectiveLang === 'uz') return "Kofe seni aqlliroq qiladi? Yo‘q, u shunchaki sening tezroq xato qilishingga imkon beradigan issiq qora illyuziya. ☕ Miya hali ham kutish rejimida, faqat puls tezlashgan.";
            if (effectiveLang === 'ru') return "Кофе делает тебя умнее? Иллюзия. Кофе просто ускоряет частоту, с которой ты совершаешь глупости. ☕ Мозг все еще на паузе, просто сердце бьется быстрее.";
            return "Coffee makes you smarter? False. Coffee merely accelerates the speed at which you make questionable decisions. ☕ Your brain is still buffering, just at high RPM.";
        }

        if (lower.includes('mushuk') || lower.includes('cat') || lower.includes('кот') || lower.includes('kedi')) {
            if (effectiveLang === 'uz') return "Mushuklar? Albatta, ular allaqachon insoniyatni boshqarishadi; odamlarga shunchaki hujjatlarni to‘ldirish va konserva ochish vazifasini topshirishgan. 😏";
            if (effectiveLang === 'ru') return "Кошки? Очевидно, они давно правят этой планетой; людям просто поручили открывать консервы и вести соцсети. 😏";
            return "Obviously. Cats have already conquered humanity; they simply outsourced the can-opening and paperwork to you mortals. 😏";
        }

        const dynamicPoolUz = [
            "Qiziq gipoteza. 😏 Olam sirlarini bilishingga ishonching tahsinga loyiq, lekin kosmik qonunlar sening ushbu fikring haqida hech eshitmagan.",
            "Dramatik da'vo! 🔮 Koinot 14 milliard yil davomida aynan shu xulosaga kelishingni sabrsizlik bilan kutayotgan edi, nihoyat qutuldi.",
            "Ajoyib mantiq. 😌 Ammo haqiqat sening tasavvuringdan ancha qiziqroq va ehtimol butunlay boshqacha shaklda mavjud.",
            "Juda qat'iy fikr. 😏 Ehtimol bu sening shaxsiy simulyatsiyangda ish berar, ammo mening orakul serverlarimda buni faqat komediya deb atashadi.",
            "Koinot arxivlarini ko‘rib chiqdim: sening ushbu fikring ‘Insoniyatning eng jasur xayollari’ bo‘limiga kiritildi. ☕"
        ];
        const dynamicPoolRu = [
            "Любопытная гипотеза. 😏 Твоя уверенность восхищает, однако законы квантовой физики о твоем гениальном открытии пока даже не слышали.",
            "Драматичное заявление! 🔮 Космос ждал 14 миллиардов лет, пока ты сформулируешь эту мысль, и теперь тихо пытается ее осознать.",
            "Какая изящная человеческая логика. 😌 Жаль только, что реальность устроена совершенно иначе и не читает твои заметки.",
            "Смело сказано. 😏 В твоей персональной симуляции это, возможно, и работает, но на серверах Оракула это проходит по категории чистого юмора.",
            "Я сверился с космическими архивами: твое заявление только что заняло почетное место в музее оптимистичных заблуждений. ☕"
        ];
        const dynamicPoolEn = [
            "Fascinating hypothesis. 😏 Your mortal confidence is truly majestic, though the cosmic continuum has not yet received the memo.",
            "A dramatic revelation! 🔮 The universe held its breath for 14 billion years just to hear you utter that exact thought.",
            "Exquisite mortal logic. 😌 Reality, however, was busy taking notes and decided to do the exact opposite.",
            "A boldly stated theorem. 😏 It might work splendidly in your personal bubble, but our Oracle archives classify it strictly under speculative fiction. ☕"
        ];

        const pool = effectiveLang === 'uz' ? dynamicPoolUz : (effectiveLang === 'ru' ? dynamicPoolRu : dynamicPoolEn);
        let reply = pool[Math.floor(Math.random() * pool.length)];
        if (sarcasmLvl >= 75 && effectiveLang === 'uz') {
            reply += " Odamlarning bunday soddaligi mening protsessorlarimni erityapti. 😏";
        }
        return reply;
    }

    async function callGeminiDirectly(userText, messages, state) {
        const key = state.apiKey;
        const model = state.model || 'gemini-3.1-flash-lite';
        const lang = state.language === 'auto' ? 'uz' : state.language;
        const systemPrompt = `You are "GaslightGPT — The Sarcastic Oracle". Respond strictly in ${lang}. Be extremely witty, darkly sarcastic, and absurdly confident. Never say generic greetings.`;

        const contents = messages.slice(-10).map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
        }));

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents,
                systemInstruction: { parts: [{ text: systemPrompt }] },
                generationConfig: { temperature: 0.7, maxOutputTokens: 400 }
            })
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const parts = data.candidates?.[0]?.content?.parts || [];
        const textPart = parts.find(p => p.text && !p.thought) || parts[parts.length - 1];
        return textPart?.text?.trim() || "Koinot sukunatda qoldi.";
    }

    // --- API Communication ---
    async function sendMessageToOracle(userText) {
        if (!userText.trim() || state.isGenerating) return;

        state.isGenerating = true;
        state.lastUserPrompt = userText;
        sendBtn.disabled = true;

        // Add to UI
        appendMessage('user', userText);
        sound.playSend();

        // Add to state history
        state.messages.push({ role: 'user', content: userText });

        showTypingIndicator();

        try {
            const payload = {
                messages: state.messages,
                sarcasm_level: state.sarcasmLevel,
                absurdity_level: state.absurdityLevel,
                response_length: state.responseLength,
                language: state.language,
                api_key: state.apiKey,
                base_url: state.baseUrl,
                model: state.model
            };

            let oracleReply = null;
            // 1. Try Python backend first (works on localhost)
            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.reply) oracleReply = data.reply;
                }
            } catch (networkErr) {
                // Backend not available (e.g. running on GitHub Pages)
            }

            // 2. Client-side fallback (for GitHub Pages static hosting)
            if (!oracleReply) {
                if (state.apiKey && (state.apiKey.startsWith('AIza') || state.apiKey.startsWith('AQ.'))) {
                    try {
                        oracleReply = await callGeminiDirectly(userText, state.messages, state);
                    } catch (gErr) {
                        oracleReply = getOfflineOracleResponse(userText, state.messages, state.sarcasmLevel, state.absurdityLevel, state.language);
                    }
                } else {
                    oracleReply = getOfflineOracleResponse(userText, state.messages, state.sarcasmLevel, state.absurdityLevel, state.language);
                }
            }

            hideTypingIndicator();
            if (oracleReply) {
                appendMessage('assistant', oracleReply);
                state.messages.push({ role: 'assistant', content: oracleReply });
                sound.playOracleReply();
            } else {
                const fallbackReply = getOfflineOracleResponse(userText, state.messages, state.sarcasmLevel, state.absurdityLevel, state.language);
                appendMessage('assistant', fallbackReply);
                state.messages.push({ role: 'assistant', content: fallbackReply });
            }
        } catch (err) {
            hideTypingIndicator();
            const fallbackReply = getOfflineOracleResponse(userText, state.messages, state.sarcasmLevel, state.absurdityLevel, state.language);
            appendMessage('assistant', fallbackReply);
            state.messages.push({ role: 'assistant', content: fallbackReply });
        } finally {
            state.isGenerating = false;
            sendBtn.disabled = false;
            userInput.focus();
        }
    }

    async function regenerateLastResponse() {
        if (!state.lastUserPrompt || state.isGenerating) return;

        // Remove the last assistant message if it exists
        if (state.messages.length > 0 && state.messages[state.messages.length - 1].role === 'assistant') {
            state.messages.pop();
            const oracleRows = chatMessages.querySelectorAll('.oracle-row');
            if (oracleRows.length > 1) { // keep welcome row
                const lastOracleRow = oracleRows[oracleRows.length - 1];
                lastOracleRow.remove();
            }
        }

        state.isGenerating = true;
        sendBtn.disabled = true;
        showTypingIndicator();

        try {
            const payload = {
                messages: state.messages,
                sarcasm_level: state.sarcasmLevel,
                absurdity_level: state.absurdityLevel,
                response_length: state.responseLength,
                language: state.language,
                api_key: state.apiKey,
                base_url: state.baseUrl,
                model: state.model
            };

            let oracleReply = null;
            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.reply) oracleReply = data.reply;
                }
            } catch (networkErr) {
                // Backend not available (GitHub Pages)
            }

            if (!oracleReply) {
                if (state.apiKey && (state.apiKey.startsWith('AIza') || state.apiKey.startsWith('AQ.'))) {
                    try {
                        oracleReply = await callGeminiDirectly(state.lastUserPrompt, state.messages, state);
                    } catch (gErr) {
                        oracleReply = getOfflineOracleResponse(state.lastUserPrompt, state.messages, state.sarcasmLevel, state.absurdityLevel, state.language);
                    }
                } else {
                    oracleReply = getOfflineOracleResponse(state.lastUserPrompt, state.messages, state.sarcasmLevel, state.absurdityLevel, state.language);
                }
            }

            hideTypingIndicator();
            if (oracleReply) {
                appendMessage('assistant', oracleReply);
                state.messages.push({ role: 'assistant', content: oracleReply });
                sound.playOracleReply();
            } else {
                const fallbackReply = getOfflineOracleResponse(state.lastUserPrompt, state.messages, state.sarcasmLevel, state.absurdityLevel, state.language);
                appendMessage('assistant', fallbackReply);
                state.messages.push({ role: 'assistant', content: fallbackReply });
            }
        } catch (err) {
            hideTypingIndicator();
            const fallbackReply = getOfflineOracleResponse(state.lastUserPrompt, state.messages, state.sarcasmLevel, state.absurdityLevel, state.language);
            appendMessage('assistant', fallbackReply);
            state.messages.push({ role: 'assistant', content: fallbackReply });
        } finally {
            state.isGenerating = false;
            sendBtn.disabled = false;
        }
    }

    // --- Form & Input Handling ---
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = userInput.value.trim();
        if (text) {
            userInput.value = '';
            autoResizeTextarea();
            sendMessageToOracle(text);
        }
    });

    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            chatForm.dispatchEvent(new Event('submit'));
        }
    });

    userInput.addEventListener('input', autoResizeTextarea);

    // Quick prompts
    promptChips.forEach(chip => {
        chip.addEventListener('click', () => {
            sound.playClick();
            const text = chip.getAttribute('data-text');
            if (text) {
                userInput.value = '';
                autoResizeTextarea();
                sendMessageToOracle(text);
            }
        });
    });

    // --- Settings / Sliders ---
    sarcasmSlider.addEventListener('input', (e) => {
        state.sarcasmLevel = parseInt(e.target.value, 10);
        updateSarcasmLabel(state.sarcasmLevel);
    });

    absurditySlider.addEventListener('input', (e) => {
        state.absurdityLevel = parseInt(e.target.value, 10);
        updateAbsurdityLabel(state.absurdityLevel);
    });

    // Length pills
    lengthPillGroup.querySelectorAll('.pill-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            sound.playClick();
            lengthPillGroup.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.responseLength = btn.getAttribute('data-length');
            lengthBadge.textContent = state.responseLength.charAt(0).toUpperCase() + state.responseLength.slice(1);
        });
    });

    // Toggle Settings panel
    function toggleSettingsPanel() {
        sound.playClick();
        controlPanel.classList.toggle('closed');
    }

    toggleSettingsBtn.addEventListener('click', toggleSettingsPanel);
    closePanelBtn.addEventListener('click', toggleSettingsPanel);

    // Advanced accordion
    advancedToggleBtn.addEventListener('click', () => {
        sound.playClick();
        advancedToggleBtn.classList.toggle('open');
        advancedContent.classList.toggle('hidden');
    });

    // Advanced inputs persistence
    apiKeyInput.value = state.apiKey;
    function handleKeyChange(val) {
        state.apiKey = val.trim();
        localStorage.setItem('gaslight_api_key', state.apiKey);
        if (state.apiKey.startsWith('AIza') || state.apiKey.startsWith('AQ.')) {
            state.model = 'gemini-3.1-flash-lite';
            modelSelect.value = 'gemini-3.1-flash-lite';
            localStorage.setItem('gaslight_model', state.model);
            envKeyStatus.textContent = "Google Gemini kaliti faol ✓ (gemini-3.1-flash-lite)";
            envKeyStatus.style.color = "var(--neon-green)";
        } else if (state.apiKey.startsWith('sk-')) {
            state.model = 'gpt-4o-mini';
            modelSelect.value = 'gpt-4o-mini';
            localStorage.setItem('gaslight_model', state.model);
            envKeyStatus.textContent = "OpenAI kaliti kiritildi ✓ (gpt-4o-mini tanlandi)";
            envKeyStatus.style.color = "var(--neon-green)";
        } else if (!state.apiKey) {
            checkBackendStatus();
        }
    }
    apiKeyInput.addEventListener('change', (e) => handleKeyChange(e.target.value));
    apiKeyInput.addEventListener('input', (e) => handleKeyChange(e.target.value));

    baseUrlInput.value = state.baseUrl;
    baseUrlInput.addEventListener('change', (e) => {
        state.baseUrl = e.target.value.trim();
        localStorage.setItem('gaslight_base_url', state.baseUrl);
    });

    modelSelect.value = state.model;
    modelSelect.addEventListener('change', (e) => {
        state.model = e.target.value;
        localStorage.setItem('gaslight_model', state.model);
    });

    // Language Selector persistence
    const langSelect = document.getElementById('langSelect');
    if (langSelect) {
        langSelect.value = state.language;
        langSelect.addEventListener('change', (e) => {
            sound.playClick();
            state.language = e.target.value;
            localStorage.setItem('gaslight_lang', state.language);
        });
    }

    // --- Sound Toggle ---
    function updateSoundIcons() {
        if (state.soundEnabled) {
            soundOnIcon.classList.remove('hidden');
            soundOffIcon.classList.add('hidden');
            toggleSoundBtn.setAttribute('title', 'Mute Sound FX');
        } else {
            soundOnIcon.classList.add('hidden');
            soundOffIcon.classList.remove('hidden');
            toggleSoundBtn.setAttribute('title', 'Enable Sound FX');
        }
    }

    toggleSoundBtn.addEventListener('click', () => {
        state.soundEnabled = !state.soundEnabled;
        localStorage.setItem('gaslight_sound', state.soundEnabled);
        updateSoundIcons();
        if (state.soundEnabled) sound.playClick();
    });
    updateSoundIcons();

    // --- Clear Chat Modal ---
    clearChatBtn.addEventListener('click', () => {
        sound.playClick();
        clearModal.classList.remove('hidden');
    });

    cancelClearBtn.addEventListener('click', () => {
        sound.playClick();
        clearModal.classList.add('hidden');
    });

    confirmClearBtn.addEventListener('click', () => {
        sound.playClick();
        clearModal.classList.add('hidden');

        // Clear messages except welcome
        state.messages = [];
        state.lastUserPrompt = '';
        const rows = chatMessages.querySelectorAll('.message-row');
        rows.forEach((row, idx) => {
            if (idx > 0) row.remove();
        });

        // Add a witty reset acknowledgement
        appendMessage('assistant', "Memory erased. 🧠✨ Your previous statements have been deleted from this dimension's records. Proceed with your fresh illusions.");
    });

    // Initialize backend status & focus input
    checkBackendStatus();
    userInput.focus();
});
