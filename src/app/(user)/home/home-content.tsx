'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { usePathname } from 'next/navigation';

import { Attachment, JSONValue } from 'ai';
import { useChat } from 'ai/react';
import { Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

import ChatInterface from '@/app/(user)/chat/[id]/chat-interface';
import BlurFade from '@/components/ui/blur-fade';
import TypingAnimation from '@/components/ui/typing-animation';
import { useConversations } from '@/hooks/use-conversations';
import { useUser } from '@/hooks/use-user';
import { EVENTS } from '@/lib/events';
import { cn } from '@/lib/utils';

import { ConversationInput } from './conversation-input';
import { getRandomSuggestions } from './data/suggestions';
import { SuggestionCard } from './suggestion-card';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 px-1 text-sm font-medium text-muted-foreground/80">
      {children}
    </h2>
  );
}

export function HomeContent() {
  const pathname = usePathname();
  const suggestions = useMemo(() => getRandomSuggestions(4), []);
  const [showChat, setShowChat] = useState(false);
  const [chatId, setChatId] = useState(() => uuidv4());
  const { user, isLoading: isUserLoading } = useUser();

  const { conversations, refreshConversations } = useConversations(user?.id);

  const resetChat = useCallback(() => {
    setShowChat(false);
    setChatId(uuidv4());
  }, []);

  const { messages, input, handleSubmit, setInput } = useChat({
    id: chatId,
    initialMessages: [],
    body: { id: chatId },
    onFinish: () => {
      if (chatId && !conversations?.find((conv) => conv.id === chatId)) {
        refreshConversations().then(() => {
          window.dispatchEvent(new CustomEvent(EVENTS.CONVERSATION_READ));
        });
      }
    },
    experimental_prepareRequestBody: ({ messages }) => {
      return {
        message: messages[messages.length - 1],
        id: chatId,
      } as unknown as JSONValue;
    },
  });

  const handleSend = async (value: string, attachments: Attachment[]) => {
    if (!value.trim() && (!attachments || attachments.length === 0)) return;

    const fakeEvent = {
      preventDefault: () => {},
      type: 'submit',
    } as React.FormEvent;

    await handleSubmit(fakeEvent, {
      data: value,
      experimental_attachments: attachments,
    });

    setShowChat(true);
    window.history.replaceState(null, '', `/chat/${chatId}`);
  };

  useEffect(() => {
    if (pathname === '/home') {
      resetChat();
    }
  }, [pathname, resetChat]);

  useEffect(() => {
    const handlePopState = () => {
      if (location.pathname === '/home') {
        resetChat();
      } else if (location.pathname === `/chat/${chatId}`) {
        setShowChat(true);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [chatId, resetChat]);

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const mainContent = (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 py-12">
      <BlurFade delay={0.2}>
        <TypingAnimation
          className="mb-12 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-center text-4xl font-semibold tracking-tight text-transparent md:text-4xl lg:text-5xl"
          duration={50}
          text="Amaze amaze. How help you?"
        />
      </BlurFade>

      <div className="mx-auto w-full max-w-3xl space-y-8">
        <BlurFade delay={0.1}>
          <ConversationInput
            value={input}
            onChange={setInput}
            onSubmit={handleSend}
            savedPrompts={[]}
            setSavedPrompts={() => {}}
          />
        </BlurFade>

        <div className="space-y-8">
          <BlurFade delay={0.2}>
            <div className="space-y-2">
              <SectionTitle>Suggestions</SectionTitle>
              <div className="grid grid-cols-2 gap-4">
                {suggestions.map((suggestion, index) => (
                  <SuggestionCard
                    key={suggestion.title}
                    {...suggestion}
                    delay={0.3 + index * 0.1}
                    onSelect={setInput}
                  />
                ))}
              </div>
            </div>
          </BlurFade>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative h-screen">
      {!showChat && (
        <div
          className={cn(
            'absolute inset-0 overflow-y-auto overflow-x-hidden transition-opacity duration-300',
            showChat ? 'pointer-events-none opacity-0' : 'opacity-100',
          )}
        >
          {mainContent}
        </div>
      )}
      {showChat && (
        <div
          className={cn(
            'absolute inset-0 transition-opacity duration-300',
            showChat ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
        >
          <ChatInterface id={chatId} initialMessages={messages} />
        </div>
      )}
    </div>
  );
}
