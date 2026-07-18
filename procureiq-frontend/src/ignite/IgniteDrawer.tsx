import { useState, useRef, useEffect } from 'react';
import {
  Drawer, Box, Typography, IconButton, TextField, InputAdornment,
  Divider, Tooltip, Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useIgniteChat } from './useIgniteChat';
import IgniteMessageBubble from './IgniteMessageBubble';

const SUGGESTED = [
  'Summarize my procurement performance',
  'Who are my top 5 suppliers by spend?',
  'What savings opportunities exist?',
  'Which contracts are expiring soon?',
  'What is my tail spend percentage?',
];

interface IgniteDrawerProps {
  open: boolean;
  onClose: () => void;
  moduleContext: string;
}

export default function IgniteDrawer({ open, onClose, moduleContext }: IgniteDrawerProps) {
  const { messages, isTyping, isLocal, sendMessage, clearChat } = useIgniteChat(moduleContext);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isTyping) return;
    setInput('');
    sendMessage(text);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <Drawer
      anchor="right" open={open} onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: 420, display: 'flex', flexDirection: 'column', bgcolor: '#fff',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
        },
      }}
    >
      {/* Header */}
      <Box sx={{ px: 2.5, py: 2, bgcolor: '#161616', display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
        <Box sx={{ width: 32, height: 32, bgcolor: '#0f62fe', borderRadius: '50%',
                   display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AutoAwesomeIcon sx={{ color: '#fff', fontSize: 16 }} />
        </Box>
        <Box>
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 15, lineHeight: 1.3 }}>Ignite</Typography>
          <Typography sx={{ color: '#8d8d8d', fontSize: 11 }}>AI Procurement Advisor · {moduleContext}</Typography>
        </Box>
        <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5 }}>
          {isLocal && (
            <Chip label="Local AI" size="small"
              sx={{ bgcolor: '#e8daff', color: '#6929c4', fontSize: 10, fontWeight: 700, height: 22 }} />
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

      {/* Messages */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column' }}>
        {messages.map(msg => (
          <IgniteMessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </Box>

      {/* Suggested prompts — shown until the user has sent their first message */}
      {messages.length <= 2 && !isTyping && (
        <Box sx={{ px: 2, pb: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 0.75, display: 'block' }}>
            Try asking:
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
        <TextField
          fullWidth multiline maxRows={4} size="small"
          placeholder="Ask Ignite anything about your procurement…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={isTyping}
          InputProps={{
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
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block', textAlign: 'center' }}>
          Ignite · Powered by IBM watsonx · Press Enter to send
        </Typography>
      </Box>
    </Drawer>
  );
}
