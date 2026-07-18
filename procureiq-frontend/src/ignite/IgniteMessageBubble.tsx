import { Box, Typography, Chip } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import RouterIcon from '@mui/icons-material/Router';
import type { IgniteMessage } from '@/core/types';

interface IgniteMessageBubbleProps {
  message: IgniteMessage;
}

function inlineFormat(line: string): React.ReactNode[] {
  // Split on **bold** markers and render alternating plain/bold spans
  return line.split(/\*\*(.*?)\*\*/g).map((part, j) =>
    j % 2 === 1 ? <strong key={j}>{part}</strong> : <span key={j}>{part}</span>
  );
}

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let inList = false;
  const listItems: React.ReactNode[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      nodes.push(
        <Box key={`list-${nodes.length}`} component="ul"
          sx={{ pl: 2.5, mt: 0.25, mb: 0.5, '& li': { mb: 0.25 } }}>
          {listItems.splice(0)}
        </Box>
      );
    }
    inList = false;
  };

  lines.forEach((line, i) => {
    // Heading (## or #)
    if (/^#{1,3} /.test(line)) {
      flushList();
      const level = (line.match(/^#+/) ?? [''])[0].length;
      const content = line.replace(/^#+\s*/, '');
      nodes.push(
        <Box key={i} component="p"
          sx={{ fontWeight: 700, fontSize: level === 1 ? 15 : level === 2 ? 14 : 13, mt: 1, mb: 0.5 }}>
          {inlineFormat(content)}
        </Box>
      );
      return;
    }

    // Numbered list item
    const numberedMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (numberedMatch) {
      if (!inList) inList = true;
      listItems.push(
        <Box key={i} component="li" sx={{ mb: 0.25 }}>
          {inlineFormat(numberedMatch[2])}
        </Box>
      );
      return;
    }

    // Bullet list item (-, •, *)
    const bulletMatch = line.match(/^[-•*]\s+(.*)/);
    if (bulletMatch) {
      if (!inList) inList = true;
      listItems.push(
        <Box key={i} component="li" sx={{ mb: 0.25 }}>
          {inlineFormat(bulletMatch[1])}
        </Box>
      );
      return;
    }

    // Blank line — end any open list
    if (line.trim() === '') {
      flushList();
      nodes.push(<Box key={i} sx={{ height: 6 }} />);
      return;
    }

    // Normal line
    flushList();
    nodes.push(
      <Box key={i} component="p" sx={{ m: 0, mb: 0.25, lineHeight: 1.65 }}>
        {inlineFormat(line)}
      </Box>
    );
  });

  flushList();
  return <>{nodes}</>;
}

export default function IgniteMessageBubble({ message }: IgniteMessageBubbleProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
        <Box sx={{
          maxWidth: '78%', bgcolor: '#0f62fe', color: '#fff',
          borderRadius: '12px 12px 2px 12px', px: 2, py: 1.25, fontSize: 13, lineHeight: 1.6,
        }}>
          {message.content}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', gap: 1, mb: 1.5, alignItems: 'flex-start' }}>
      <Box sx={{
        width: 28, height: 28, borderRadius: '50%', bgcolor: '#eff4ff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.5,
      }}>
        <AutoAwesomeIcon sx={{ fontSize: 15, color: '#0f62fe' }} />
      </Box>
      <Box sx={{ flex: 1 }}>
        <Box sx={{
          bgcolor: '#f4f4f4', borderRadius: '2px 12px 12px 12px',
          px: 2, py: 1.25, fontSize: 13, lineHeight: 1.7, color: '#161616',
          position: 'relative',
        }}>
          {message.isStreaming && !message.content
            ? <Box sx={{ display: 'flex', gap: 0.5, py: 0.5 }}>
                {[0,1,2].map(i => (
                  <Box key={i} sx={{
                    width: 6, height: 6, borderRadius: '50%', bgcolor: '#0f62fe',
                    animation: 'bounce 1.2s ease-in-out infinite',
                    animationDelay: `${i * 0.2}s`,
                    '@keyframes bounce': { '0%,80%,100%': { transform: 'scale(0)' }, '40%': { transform: 'scale(1)' } },
                  }} />
                ))}
              </Box>
            : renderMarkdown(message.content)
          }
        </Box>
        {/* Citations */}
        {message.citations && message.citations.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.75 }}>
            {message.citations.map((c, i) => (
              <Chip key={i} label={c.label} size="small"
                sx={{ height: 20, fontSize: 10, bgcolor: '#eff4ff', color: '#0043ce', fontWeight: 600 }} />
            ))}
          </Box>
        )}
        {/* Local inference badge */}
        {message.isLocalInference && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
            <RouterIcon sx={{ fontSize: 11, color: '#8a3ffc' }} />
            <Typography sx={{ fontSize: 10, color: '#8a3ffc' }}>Local Inference (Ollama)</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
