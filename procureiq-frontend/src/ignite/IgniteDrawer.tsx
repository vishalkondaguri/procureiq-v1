import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Drawer, Box, Typography, IconButton, TextField, InputAdornment,
  Divider, Tooltip, Chip, CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import { useIgniteChat } from './useIgniteChat';
import IgniteMessageBubble from './IgniteMessageBubble';

const SUGGESTED = [
  'Summarize my procurement performance',
  'Who are my top 5 suppliers by spend?',
  'What savings opportunities exist?',
  'Which contracts are expiring soon?',
  'What is my tail spend percentage?',
  'Compare supplier performance this quarter',
  'Identify any procurement anomalies',
];

// ── Web Speech API type declarations ─────────────────────────────────────────
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionError) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionError extends Event {
  error: string;
}

interface IgniteDrawerProps {
  open: boolean;
  onClose: () => void;
  moduleContext: string;
}

export default function IgniteDrawer({ open, onClose, moduleContext }: IgniteDrawerProps) {
  const { messages, isTyping, isLocal, sendMessage, clearChat } = useIgniteChat(moduleContext);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Check voice support
  useEffect(() => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      setVoiceSupported(true);
      const rec = new SpeechRec();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (e: SpeechRecognitionEvent) => {
        let transcript = '';
        for (let i = e.results.length - 1; i >= 0; i--) {
          transcript = e.results[i][0].transcript;
          if (e.results[i].isFinal) {
            setInput(transcript);
            setIsListening(false);
            break;
          }
        }
        if (!e.results[e.results.length - 1]?.isFinal) {
          setInput(transcript);
        }
      };

      rec.onerror = () => setIsListening(false);
      rec.onend   = () => setIsListening(false);
      recognitionRef.current = rec;
    }
  }, []);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // TTS: speak last assistant message
  useEffect(() => {
    if (!ttsEnabled || !messages.length) return;
    const last = messages[messages.length - 1];
    if (last.role !== 'assistant' || !last.content) return;
    const utt = new SpeechSynthesisUtterance(last.content.slice(0, 300));
    utt.rate = 1.1;
    utt.pitch = 1;
    window.speechSynthesis.speak(utt);
  }, [messages, ttsEnabled]);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setInput('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isTyping) return;
    setInput('');
    sendMessage(text);
  }, [input, isTyping, sendMessage]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <Drawer
      anchor="right" open={open} onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: 440, display: 'flex', flexDirection: 'column', bgcolor: '#fff',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
        },
      }}
    >
      {/* Header */}
      <Box sx={{ px: 2.5, py: 2, bgcolor: '#161616', display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
        <Box sx={{ width: 36, height: 36, bgcolor: '#0f62fe', borderRadius: '50%',
                   display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <AutoAwesomeIcon sx={{ color: '#fff', fontSize: 18 }} />
        </Box>
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>Ignite</Typography>
          <Typography sx={{ color: '#8d8d8d', fontSize: 11, lineHeight: 1.2 }}>AI Procurement Copilot · {moduleContext}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.25 }}>
          {isLocal && (
            <Chip label="Local AI" size="small"
              sx={{ bgcolor: '#e8daff', color: '#6929c4', fontSize: 10, fontWeight: 700, height: 22 }} />
          )}
          {voiceSupported && (
            <Tooltip title={ttsEnabled ? 'Mute voice responses' : 'Enable voice responses'}>
              <IconButton size="small" onClick={() => setTtsEnabled(t => !t)} sx={{ color: ttsEnabled ? '#78a9ff' : '#6f6f6f' }}>
                {ttsEnabled ? <VolumeUpIcon sx={{ fontSize: 16 }} /> : <VolumeOffIcon sx={{ fontSize: 16 }} />}
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Clear chat">
            <IconButton size="small" onClick={clearChat} sx={{ color: '#8d8d8d' }}>
              <DeleteSweepIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={onClose} sx={{ color: '#8d8d8d' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Capability chips */}
      <Box sx={{ px: 2.5, py: 1, bgcolor: '#1c1c1c', borderBottom: '1px solid #393939', display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
        {['Spend Analysis', 'Contract Intel', 'Risk Assessment', 'Savings Opps', 'Supplier 360'].map(cap => (
          <Chip key={cap} label={cap} size="small"
            sx={{ fontSize: 10, height: 20, bgcolor: '#262626', color: '#a6c8ff', border: '1px solid #393939' }} />
        ))}
      </Box>

      {/* Messages */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column' }}>
        {messages.map(msg => (
          <IgniteMessageBubble key={msg.id} message={msg} />
        ))}
        {isTyping && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
            <Box sx={{ width: 28, height: 28, bgcolor: '#eff4ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AutoAwesomeIcon sx={{ color: '#0f62fe', fontSize: 14 }} />
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              <CircularProgress size={10} sx={{ color: '#0f62fe' }} />
              <Typography sx={{ fontSize: 12, color: '#525252', fontStyle: 'italic' }}>Ignite is thinking…</Typography>
            </Box>
          </Box>
        )}
        <div ref={bottomRef} />
      </Box>

      {/* Suggested prompts — shown until the user has sent their first message */}
      {messages.length <= 2 && !isTyping && (
        <Box sx={{ px: 2, pb: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 0.75, display: 'block' }}>
            Suggested prompts:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {SUGGESTED.map((s, i) => (
              <Chip
                key={i} label={s} size="small" clickable
                onClick={() => sendMessage(s)}
                sx={{ bgcolor: '#f0f4ff', color: '#0043ce', fontSize: 11, height: 26, fontWeight: 500 }}
              />
            ))}
          </Box>
        </Box>
      )}

      <Divider />

      {/* Input */}
      <Box sx={{ p: 2, flexShrink: 0 }}>
        {isListening && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, px: 1.5, py: 1,
                     bgcolor: '#fff1f1', borderRadius: 1, border: '1px solid #ffd7d9' }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#da1e28',
                       animation: 'pulse 1s infinite', '@keyframes pulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.3 } } }} />
            <Typography sx={{ fontSize: 11, color: '#da1e28', fontWeight: 600 }}>Listening… speak now</Typography>
          </Box>
        )}
        <TextField
          fullWidth multiline maxRows={4} size="small"
          placeholder={isListening ? 'Listening…' : 'Ask Ignite anything about your procurement…'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={isTyping}
          InputProps={{
            startAdornment: voiceSupported ? (
              <InputAdornment position="start">
                <Tooltip title={isListening ? 'Stop listening' : 'Voice input'}>
                  <IconButton
                    size="small" edge="start"
                    onClick={toggleListening}
                    disabled={isTyping}
                    sx={{
                      color: isListening ? '#da1e28' : '#8d8d8d',
                      animation: isListening ? 'pulse 1s infinite' : 'none',
                      '@keyframes pulse': { '0%, 100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.15)' } },
                    }}
                  >
                    {isListening ? <MicIcon sx={{ fontSize: 18 }} /> : <MicOffIcon sx={{ fontSize: 18 }} />}
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ) : undefined,
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  size="small" color="primary"
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  sx={{ bgcolor: 'primary.main', color: '#fff !important', borderRadius: 1,
                        '&:hover': { bgcolor: 'primary.dark' },
                        '&.Mui-disabled': { bgcolor: '#c6c6c6', color: '#fff !important' } }}
                >
                  <SendIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </InputAdornment>
            ),
            sx: { alignItems: 'flex-end' },
          }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />
        <Box sx={{ mt: 0.75, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
            {voiceSupported ? '🎤 Voice enabled · ' : ''}Press Enter to send
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
            Powered by IBM watsonx
          </Typography>
        </Box>
      </Box>
    </Drawer>
  );
}
