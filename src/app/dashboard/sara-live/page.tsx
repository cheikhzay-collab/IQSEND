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

      {/* ── Settings Panel ── */}
      {showSettings && (
        <div className="sara-settings">
          <h3>⚙️ إعدادات الجلسة</h3>
          <div className="sara-settings-grid">
            <div className="sara-field">
              <label>👤 اسم الزبون</label>
              <input
                type="text"
                placeholder="أدخل اسمك..."
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="sara-input-field"
              />
            </div>
            <div className="sara-field">
              <label>📞 رقم الهاتف</label>
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
