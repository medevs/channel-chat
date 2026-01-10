import { useState, useCallback } from "react";
import { useRagChat } from "./useRagChat";
import type { ChatMessage, Creator } from "@/types/chat";

export function useChat() {
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  const ragChat = useRagChat({ 
    channelId: selectedCreator?.channelId || null 
  });

  const selectCreator = useCallback((creator: Creator | null) => {
    setSelectedCreator(creator);
    setMessages([]); // Clear messages when switching creators
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !selectedCreator) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: content.trim(),
      timestamp: new Date(),
      role: 'user',
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const aiMessage = await ragChat.sendMessage(content.trim());
      if (aiMessage) {
        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        type: 'ai',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
        role: 'assistant',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  }, [selectedCreator, ragChat]);

  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);

  const saveMessage = useCallback((messageId: string) => {
    // TODO: Implement message saving to favorites
    console.log('Saving message:', messageId);
  }, []);

  return {
    selectedCreator,
    messages,
    isTyping,
    sendMessage,
    clearChat,
    selectCreator,
    saveMessage,
  };
}
