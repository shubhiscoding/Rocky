'use client';

import { useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

import BlurFade from '@/components/ui/blur-fade';
import { useUser } from '@/hooks/use-user';
import { createConversationStub } from '@/server/actions/conversation';

import { ConversationInput } from './conversation-input';
import { getRandomSuggestions } from './data/suggestions';
import { SuggestionCard } from './suggestion-card';

export function HomeContent() {
  const router = useRouter();
  const suggestions = useMemo(() => getRandomSuggestions(6), []);
  const [input, setInput] = useState('');
  const [chatId] = useState(() => uuidv4());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isLoading: isUserLoading } = useUser();

  const handleSend = async (value: string) => {
    if (!value.trim() || isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Store the message so ChatInterface can auto-submit it on mount
      sessionStorage.setItem(`pending-chat-${chatId}`, value);

      // Create a stub conversation so the chat page doesn't 404
      await createConversationStub({ conversationId: chatId });

      router.push(`/chat/${chatId}`);
    } catch {
      sessionStorage.removeItem(`pending-chat-${chatId}`);
      setIsSubmitting(false);
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 py-12">
      {/* Ambient glow behind the input */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-500/10 blur-3xl" />

      <BlurFade delay={0.1}>
        <div className="mb-2 flex items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-cyan-600 text-xl font-black text-white shadow-lg shadow-teal-500/20">
            ✦
          </div>
        </div>
      </BlurFade>

      <BlurFade delay={0.2}>
        <h1 className="mb-10 text-center text-3xl font-bold tracking-tight text-foreground/90 md:text-4xl lg:text-5xl">
          Amaze amaze.{' '}
          <span className="bg-gradient-to-r from-teal-400 to-cyan-500 bg-clip-text text-transparent">
            How help you?
          </span>
        </h1>
      </BlurFade>

      <div className="relative mx-auto w-full max-w-2xl space-y-6">
        <BlurFade delay={0.1}>
          <ConversationInput
            value={input}
            onChange={setInput}
            onSubmit={handleSend}
          />
        </BlurFade>

        <BlurFade delay={0.25}>
          <div className="flex flex-wrap justify-center gap-2">
            {suggestions.map((suggestion, index) => (
              <SuggestionCard
                key={suggestion.title}
                {...suggestion}
                delay={0.3 + index * 0.05}
                onSelect={setInput}
              />
            ))}
          </div>
        </BlurFade>
      </div>
    </div>
  );
}
