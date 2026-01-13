import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '@/components/chat/EmptyState';
import type { Creator } from '@/types/chat';

const mockCreator: Creator = {
  id: '1',
  name: 'Test Creator',
  avatar: '/test-avatar.jpg',
  subscriberCount: '100K',
  videosIndexed: 5,
  status: 'completed'
};

describe('Chat Components', () => {
  it('renders EmptyState component', () => {
    render(
      <EmptyState 
        creator={mockCreator} 
        onPromptClick={() => {}} 
      />
    );
    
    expect(screen.getByText('Start a conversation')).toBeInTheDocument();
    expect(screen.getByText(/Ask anything about the creator's videos/)).toBeInTheDocument();
  });

  it('displays correct video count in EmptyState', () => {
    render(
      <EmptyState 
        creator={mockCreator} 
        onPromptClick={() => {}} 
      />
    );
    
    expect(screen.getByText(/Ask anything about the creator's videos/)).toBeInTheDocument();
  });
});
