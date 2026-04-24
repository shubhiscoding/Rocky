import { useEffect, useRef } from 'react';

import { Attachment } from 'ai';
import { SendHorizontal } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface ConversationInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string, attachments: Attachment[]) => Promise<void>;
  onChat?: boolean;
  savedPrompts?: unknown[];
  setSavedPrompts?: (v: unknown) => void;
}

export const MAX_CHARS = 2000;

export function ConversationInput({
  value,
  onChange,
  onSubmit,
  onChat = false,
}: ConversationInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!value.trim()) return;
    await onSubmit(value, []);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (newValue.length <= MAX_CHARS) {
      onChange(newValue);
      return;
    }
    toast.error('Maximum character limit reached');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  return (
    <div
      className={cn(
        'relative',
        !onChat && 'duration-500 animate-in fade-in slide-in-from-bottom-4',
      )}
    >
      <div
        className={cn(
          'relative rounded-2xl border bg-muted/40 transition-colors duration-200',
          value
            ? 'border-teal-500/50 shadow-sm shadow-teal-500/10'
            : 'border-border/50 hover:border-border',
        )}
      >
        <form onSubmit={handleSubmit} className="flex flex-col">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            maxLength={MAX_CHARS}
            placeholder={
              onChat ? 'Ask Rocky anything...' : 'Ask Rocky anything...'
            }
            className="min-h-[100px] max-h-[350px] w-full resize-none overflow-y-scroll rounded-2xl border-0 bg-transparent px-4 py-3.5 text-base focus-visible:ring-0"
          />

          <div className="flex items-center px-4 py-2.5">
            <span className="mr-auto text-xs text-muted-foreground/50">
              {value.length > 0 && `${value.length}/${MAX_CHARS}`}
            </span>
            <Button
              type="submit"
              size="icon"
              disabled={!value.trim()}
              className={cn(
                'h-8 w-8 rounded-full transition-all duration-200',
                value.trim()
                  ? 'bg-teal-500 text-white hover:bg-teal-400 shadow-sm shadow-teal-500/30'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              <SendHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
