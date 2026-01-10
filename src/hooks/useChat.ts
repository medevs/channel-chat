import { useState, useCallback } from "react";
import type { ChatState, ChatMessage, Creator, ConfidenceLevel, VideoSource } from "@/types/chat";

// Mock data for development
const mockConfidence: ConfidenceLevel = {
  level: 'high',
  label: 'High confidence',
  description: 'This answer is well-supported by the creator\'s content',
  evidenceCount: 3,
  videoCount: 2
};

const mockSources: VideoSource[] = [
  {
    id: '1',
    title: 'Live AI Coding with Ray Fernando - Exploring NEW Workflows',
    thumbnail: '/video-thumb.jpg',
    timestamp: 67.31,
    url: 'https://youtube.com/watch?v=example1'
  },
  {
    id: '2',
    title: 'Live AI Coding with Ray Fernando - Exploring NEW Workflows',
    thumbnail: '/video-thumb.jpg',
    timestamp: 68.37,
    url: 'https://youtube.com/watch?v=example2'
  }
];

// Mock creators data
const mockCreators: Creator[] = [
  {
    id: '1',
    name: 'Developers Digest',
    avatar: '/creator-avatar-1.jpg',
    subscriberCount: '54.3K',
    videosIndexed: 10,
    status: 'completed'
  },
  {
    id: '2',
    name: 'Cole Medin',
    avatar: '/creator-avatar-2.jpg',
    subscriberCount: '182.0K',
    videosIndexed: 9,
    status: 'completed'
  },
  {
    id: '3',
    name: 'Processing Creator',
    avatar: '/creator-avatar-3.jpg',
    subscriberCount: '25.1K',
    videosIndexed: 0,
    status: 'processing',
    progress: 45
  }
];

export function useChat() {
  const [state, setState] = useState<ChatState>(() => ({
    selectedCreator: null,
    currentSession: null,
    messages: [],
    isTyping: false,
    isLoading: false,
  }));

  const selectCreator = useCallback((creatorId: string | null) => {
    const creator = creatorId ? mockCreators.find(c => c.id === creatorId) || null : null;
    setState(prev => ({
      ...prev,
      selectedCreator: creator,
      messages: [], // Clear messages when switching creators
      currentSession: null,
    }));
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!state.selectedCreator || state.isTyping) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    // Add user message immediately
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isTyping: true,
    }));

    // Simulate AI response delay
    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I don't think I covered that specifically in my indexed videos. Based on my content, I focus more on practical development workflows and AI-assisted coding techniques. If you're looking for specific information about that topic, you might want to check my latest videos or ask about something I've discussed in my tutorials.`,
        timestamp: new Date(),
        confidence: mockConfidence,
        sources: content.toLowerCase().includes('where') ? mockSources : undefined,
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, aiMessage],
        isTyping: false,
      }));
    }, 2000);
  }, [state.selectedCreator, state.isTyping]);

  const clearChat = useCallback(() => {
    setState(prev => ({
      ...prev,
      messages: [],
      currentSession: null,
    }));
  }, []);

  const saveMessage = useCallback((messageId: string) => {
    // TODO: Implement message saving
    console.log('Saving message:', messageId);
  }, []);

  return {
    ...state,
    selectCreator,
    sendMessage,
    clearChat,
    saveMessage,
  };
}
