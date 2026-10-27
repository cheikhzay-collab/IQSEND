'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'sara';
  text: string;
  timestamp: Date;
  imagePreview?: string;
  audioPreview?: string;
  productImages?: Array<{ url: string; caption: string }>;
  toolCalled?: string;
  suggestedActions?: string[];
  isLoading?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────────

function generateId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // strip data:...;base64,
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Sara Live Agent Page
// ─────────────────────────────────────────────────────────────────────────────

export default function SaraLivePage() {
  const [sessionId] = useState(() => 'sara-' + generateId());
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'sara',
      text: '🌟 سلام عليكم! أنا سارة لايف، وكيلتكم الذكية في متجر IQSend 🛍️\n\nيمكنكم:\n• 📝 كتابة سؤالكم بالدارجة أو الفرنسية\n• 📸 إرسال صورة لأي منتج أو سلعة\n• 🎤 التحدث بالصوت وأنا نفهمكم\n• 📦 تتبع طلبيتكم\n• 🛒 تسجيل طلبية جديدة\n\nبماذا يمكنني مساعدتكم اليوم؟ 😊',
      timestamp: new Date(),
      suggestedActions: ['🛍️ عرض المنتجات', '📦 تتبع طلبيتي', '❓ عندي سؤال'],
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // ── WhatsApp Integration State ──
  const [waConfig, setWaConfig] = useState<{
    enabled: boolean;
    mode: 'sara_live' | 'classic_agent' | 'disabled';
    voiceEnabled: boolean;
    visionEnabled: boolean;
    autoConfirmOrders: boolean;
    autoSendProductImages: boolean;
    geminiModel: string;
  }>({
    enabled: true,
    mode: 'sara_live',
    voiceEnabled: true,
    visionEnabled: true,
    autoConfirmOrders: true,
    autoSendProductImages: true,
    geminiModel: 'gemini-2.0-flash',
  });
  const [isUpdatingWa, setIsUpdatingWa] = useState(false);
  const [waSaveStatus, setWaSaveStatus] = useState<string | null>(null);

  const fetchWaConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/sara-live/settings');
      const data = await res.json();
      if (data.success && data.config) {
        setWaConfig(data.config);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchWaConfig();
  }, [fetchWaConfig]);

  const toggleWhatsAppEnabled = async () => {
    const nextEnabled = !waConfig.enabled;
    setIsUpdatingWa(true);
    try {
      const res = await fetch('/api/sara-live/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextEnabled }),
      });
      const data = await res.json();
      if (data.success && data.config) {
        setWaConfig(data.config);
        setWaSaveStatus(nextEnabled ? 'تم تفعيل سارة على الواتساب بنجاح ✅' : 'تم إيقاف الردود الآلية على الواتساب ⏸️');
        setTimeout(() => setWaSaveStatus(null), 3000);
      }
    } catch (e) {
      alert('تعذّر تحديث حالة الواتساب');
    } finally {
      setIsUpdatingWa(false);
    }
  };

  const updateWaOption = async (patch: Partial<typeof waConfig>) => {
    setIsUpdatingWa(true);
    try {
      const res = await fetch('/api/sara-live/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (data.success && data.config) {
        setWaConfig(data.config);
        setWaSaveStatus('تم حفظ الإعدادات بنجاح ✅');
        setTimeout(() => setWaSaveStatus(null), 2500);
      }
    } catch (e) {
      alert('خطأ أثناء حفظ الإعدادات');
    } finally {
      setIsUpdatingWa(false);
    }
  };

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Image Picker ────────────────────────────────────────────────────────
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedImage(file);
    const url = URL.createObjectURL(file);
    setImagePreviewUrl(url);
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    setImagePreviewUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Voice Recording ─────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      alert('تعذّر الوصول للميكروفون. تأكد من الإذن.');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const cancelRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setAudioBlob(null);
    audioChunksRef.current = [];
  };

  // ── Send Message ────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (textOverride?: string) => {
    const text = textOverride || inputText.trim();
    if (!text && !selectedImage && !audioBlob) return;
    if (isLoading) return;

    // Build user message for UI
    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      text: text || (selectedImage ? `[صورة: ${selectedImage.name}]` : audioBlob ? '[رسالة صوتية 🎤]' : ''),
      imagePreview: imagePreviewUrl,
      audioPreview: audioBlob ? URL.createObjectURL(audioBlob) : undefined,
      timestamp: new Date(),
    };

    const loadingMsg: ChatMessage = {
      id: generateId(),
      role: 'sara',
      text: '',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setInputText('');
    setIsLoading(true);

    // Prepare payload
    let userImageBase64: string | undefined;
    let userImageMimeType: string | undefined;
    let userAudioBase64: string | undefined;
    let userAudioMimeType: string | undefined;

    if (selectedImage) {
      userImageBase64 = await fileToBase64(selectedImage);
      userImageMimeType = selectedImage.type || 'image/jpeg';
    }

    if (audioBlob) {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(audioBlob);
      });
      userAudioBase64 = base64;
      userAudioMimeType = 'audio/webm';
    }

    // Reset inputs
    setSelectedImage(null);
    setImagePreviewUrl('');
    setAudioBlob(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    try {
      const res = await fetch('/api/sara-live/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userText: text || undefined,
          userImageBase64,
          userImageMimeType,
          userAudioBase64,
          userAudioMimeType,
          customerPhone: customerPhone || undefined,
          customerName: customerName || undefined,
        }),
      });

      const data = await res.json();

      setMessages(prev =>
        prev.map(m =>
          m.id === loadingMsg.id
            ? {
                ...m,
                isLoading: false,
                text: data.reply || 'ما جاني رد. عاود المحاولة.',
                toolCalled: data.toolCalled,
                productImages: data.productImages,
                suggestedActions: data.suggestedActions,
              }
            : m
        )
      );
    } catch (err) {
      setMessages(prev =>
        prev.map(m =>
          m.id === loadingMsg.id
            ? { ...m, isLoading: false, text: '⚠️ خطأ في الاتصال. تأكد من الإنترنت وعاود المحاولة.' }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [inputText, selectedImage, imagePreviewUrl, audioBlob, isLoading, sessionId, customerPhone, customerName]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="sara-container">
      {/* ── Header ── */}
      <header className="sara-header">
        <div className="sara-header-left">
          <div className="sara-avatar">
            <span className="sara-avatar-emoji">🤖</span>
            <span className="sara-status-dot" />
          </div>
          <div>
            <h1 className="sara-title">سارة لايف</h1>
            <p className="sara-subtitle">وكيلة IQSend الذكية • صوت + صورة + دارجة</p>
          </div>
        </div>
        <div className="sara-header-right">
          <span className="sara-badge">Gemini AI ✨</span>
          <button
            className="sara-settings-btn"
            onClick={() => setShowSettings(!showSettings)}
            title="إعدادات الجلسة"
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* ── WhatsApp Integration Banner ── */}
      <div className={`sara-wa-banner ${!waConfig.enabled || waConfig.mode === 'disabled' ? 'disabled' : ''}`}>
        <div className="sara-wa-info">
          <span className="sara-wa-pulse-dot" />
          <span>
            {waConfig.enabled && waConfig.mode === 'sara_live'
              ? '🟢 سارة لايف مربوطة بالواتساب ومفعّلة (تستجيب للصوت، الصور، وتبيع وتتبع الطلبيات بالدارجة)'
              : waConfig.enabled && waConfig.mode === 'classic_agent'
              ? '🤖 الوكيل الكلاسيكي مفعل على الواتساب (تأكيد الطلبيات فقط)'
              : '🔴 الرد الآلي على الواتساب متوقف (وضع التدخل البشري اليدوي)'}
          </span>
          <span className="sara-wa-mode-badge">
            {waConfig.mode === 'sara_live' ? 'سارة لايف' : waConfig.mode === 'classic_agent' ? 'الوكيل الكلاسيكي' : 'معطل'}
          </span>
        </div>
        <div className="sara-wa-actions">
          {waSaveStatus && <span style={{ fontSize: 11, color: '#34d399', fontWeight: 600 }}>{waSaveStatus}</span>}
          <button
            className="sara-wa-toggle-btn"
            onClick={toggleWhatsAppEnabled}
            disabled={isUpdatingWa}
            title="تبديل التشغيل والإيقاف"
          >
            {isUpdatingWa ? '⏳ جاري الحفظ...' : waConfig.enabled ? '⏸️ إيقاف الربط' : '▶️ تشغيل سارة على الواتساب'}
          </button>
        </div>
      </div>

      {/* ── Settings Panel ── */}
      {showSettings && (
        <div className="sara-settings">
          {/* WhatsApp Control Card */}
          <div className="sara-wa-settings-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>📱</span>
                <strong style={{ fontSize: 15, color: '#f8fafc' }}>إعدادات ربط سارة بالواتساب (WhatsApp Bot)</strong>
              </div>
              <button
                className="sara-wa-toggle-btn"
                onClick={toggleWhatsAppEnabled}
                disabled={isUpdatingWa}
              >
                {waConfig.enabled ? '⏸️ إيقاف مؤقت' : '▶️ تشغيل الآن'}
              </button>
            </div>

            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '0 0 10px 0' }}>
              اختر وضع الذكاء الاصطناعي النشط عند استقبال رسائل من الزبناء عبر WhatsApp:
            </p>

            <div className="sara-wa-modes-grid">
              <div
                className={`sara-wa-mode-option ${waConfig.mode === 'sara_live' ? 'active' : ''}`}
                onClick={() => updateWaOption({ mode: 'sara_live', enabled: true })}
              >
                <div style={{ fontWeight: 700, fontSize: 13, color: '#c4b5fd' }}>⚡ سارة لايف المتكاملة (موصى به)</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
                  بيع بالدارجة + فهم الصوت والصور + عرض الكتالوج وتتبع الطلبيات
                </div>
              </div>

              <div
                className={`sara-wa-mode-option ${waConfig.mode === 'classic_agent' ? 'active' : ''}`}
                onClick={() => updateWaOption({ mode: 'classic_agent', enabled: true })}
              >
                <div style={{ fontWeight: 700, fontSize: 13, color: '#93c5fd' }}>🤖 الوكيل الكلاسيكي</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
                  تأكيد الطلبات والعناوين السابقة فقط
                </div>
              </div>

              <div
                className={`sara-wa-mode-option ${waConfig.mode === 'disabled' ? 'active' : ''}`}
                onClick={() => updateWaOption({ mode: 'disabled', enabled: false })}
              >
                <div style={{ fontWeight: 700, fontSize: 13, color: '#fca5a5' }}>⏸️ إيقاف الرد الآلي</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
                  استقبال الرسائل في صندوق الوارد دون أي رد آلي (تدخل بشري فقط)
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10 }}>
              <label className="sara-wa-checkbox-row">
                <span>🎙️ الرد التفاعلي على الملاحظات الصوتية (Voice Notes)</span>
                <input
                  type="checkbox"
                  checked={waConfig.voiceEnabled}
                  onChange={e => updateWaOption({ voiceEnabled: e.target.checked })}
                  style={{ width: 18, height: 18, accentColor: '#8b5cf6', cursor: 'pointer' }}
                />
              </label>

              <label className="sara-wa-checkbox-row">
                <span>📷 تحليل الصور المرئية للمنتجات (Vision AI)</span>
                <input
                  type="checkbox"
                  checked={waConfig.visionEnabled}
                  onChange={e => updateWaOption({ visionEnabled: e.target.checked })}
                  style={{ width: 18, height: 18, accentColor: '#8b5cf6', cursor: 'pointer' }}
                />
              </label>

              <label className="sara-wa-checkbox-row">
                <span>🖼️ إرسال صور المنتجات للزبون تلقائياً عبر الواتساب</span>
                <input
                  type="checkbox"
                  checked={waConfig.autoSendProductImages}
                  onChange={e => updateWaOption({ autoSendProductImages: e.target.checked })}
                  style={{ width: 18, height: 18, accentColor: '#8b5cf6', cursor: 'pointer' }}
                />
              </label>
            </div>
          </div>

          <h3 style={{ marginTop: 12 }}>⚙️ محاكاة جلسة التجربة المحلية</h3>
          <div className="sara-settings-grid">
            <div className="sara-field">
              <label>👤 اسم الزبون التجريبي</label>
              <input
                type="text"
                placeholder="أدخل اسماً للتجربة..."
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="sara-input-field"
              />
            </div>
            <div className="sara-field">
              <label>📞 رقم الهاتف للتجربة</label>
              <input
                type="tel"
                placeholder="06XXXXXXXX"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                className="sara-input-field"
              />
            </div>
          </div>
          <p className="sara-session-id">🔑 معرف الجلسة: <code>{sessionId}</code></p>
        </div>
      )}

      {/* ── Chat Messages ── */}
      <div className="sara-chat">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`sara-message-wrapper ${msg.role === 'user' ? 'sara-user-wrapper' : 'sara-sara-wrapper'}`}
          >
            {msg.role === 'sara' && (
              <div className="sara-msg-avatar">🤖</div>
            )}
            <div className={`sara-message ${msg.role === 'user' ? 'sara-user-msg' : 'sara-sara-msg'}`}>
              {/* Image Preview */}
              {msg.imagePreview && (
                <img src={msg.imagePreview} alt="صورة مرسلة" className="sara-msg-image" />
              )}
              {/* Audio Preview */}
              {msg.audioPreview && (
                <audio controls src={msg.audioPreview} className="sara-msg-audio" />
              )}
              {/* Loading Dots */}
              {msg.isLoading ? (
                <div className="sara-typing">
                  <span /><span /><span />
                </div>
              ) : (
                <p className="sara-msg-text" dir="auto">{msg.text}</p>
              )}
              {/* Tool Badge */}
              {msg.toolCalled && (
                <span className="sara-tool-badge">🔧 {msg.toolCalled}</span>
              )}
              {/* Product Images */}
              {msg.productImages && msg.productImages.length > 0 && (
                <div className="sara-product-images">
                  {msg.productImages.map((img, i) => (
                    <div key={i} className="sara-product-img-wrap">
                      <img src={img.url} alt={img.caption} className="sara-product-img" />
                      <p className="sara-product-img-caption">{img.caption}</p>
                    </div>
                  ))}
                </div>
              )}
              {/* Timestamp */}
              {!msg.isLoading && (
                <span className="sara-msg-time">
                  {msg.timestamp.toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="sara-msg-avatar sara-user-avatar">👤</div>
            )}
          </div>
        ))}

        {/* Suggested Actions */}
        {messages.length > 0 && !isLoading && (
          (() => {
            const last = messages[messages.length - 1];
            if (last.role === 'sara' && last.suggestedActions && last.suggestedActions.length > 0) {
              return (
                <div className="sara-suggestions">
                  {last.suggestedActions.map((action, i) => (
                    <button
                      key={i}
                      className="sara-suggestion-btn"
                      onClick={() => sendMessage(action)}
                    >
                      {action}
                    </button>
                  ))}
                </div>
              );
            }
            return null;
          })()
        )}

        <div ref={chatEndRef} />
      </div>

      {/* ── Input Bar ── */}
      <div className="sara-input-bar">
        {/* Image Preview Bar */}
        {imagePreviewUrl && (
          <div className="sara-image-preview-bar">
            <img src={imagePreviewUrl} alt="preview" className="sara-img-preview-thumb" />
            <span className="sara-img-preview-name">{selectedImage?.name}</span>
            <button className="sara-remove-img" onClick={removeSelectedImage}>✕</button>
          </div>
        )}

        {/* Audio Recording Indicator */}
        {isRecording && (
          <div className="sara-recording-bar">
            <span className="sara-rec-dot" />
            <span>جاري التسجيل...</span>
            <button className="sara-stop-rec-btn" onClick={stopRecording}>⏹ إيقاف</button>
            <button className="sara-cancel-rec-btn" onClick={cancelRecording}>✕ إلغاء</button>
          </div>
        )}

        {/* Audio Blob Ready */}
        {audioBlob && !isRecording && (
          <div className="sara-audio-ready-bar">
            <span>🎤 رسالة صوتية جاهزة</span>
            <button className="sara-cancel-rec-btn" onClick={() => setAudioBlob(null)}>✕</button>
          </div>
        )}

        <div className="sara-input-row">
          {/* Image Upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sara-file-hidden"
            onChange={handleImageSelect}
          />
          <button
            className="sara-icon-btn"
            title="إرسال صورة"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            📷
          </button>

          {/* Voice Recording */}
          <button
            className={`sara-icon-btn ${isRecording ? 'sara-recording-active' : ''}`}
            title={isRecording ? 'إيقاف التسجيل' : 'تسجيل رسالة صوتية'}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isLoading}
          >
            🎤
          </button>

          {/* Text Input */}
          <textarea
            className="sara-textarea"
            placeholder="اكتب رسالتك بالدارجة أو الفرنسية... (Enter للإرسال)"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isLoading}
            dir="auto"
          />

          {/* Send Button */}
          <button
            className={`sara-send-btn ${isLoading ? 'sara-send-loading' : ''}`}
            onClick={() => sendMessage()}
            disabled={isLoading || (!inputText.trim() && !selectedImage && !audioBlob)}
            title="إرسال"
          >
            {isLoading ? '⏳' : '➤'}
          </button>
        </div>
      </div>
    </div>
  );
}
