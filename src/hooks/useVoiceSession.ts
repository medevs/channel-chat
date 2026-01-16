import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface VoiceSessionState {
  status: 'idle' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'error';
  transcript: string;
  aiTranscript: string;
  error: string | null;
  durationSeconds: number;
}

export interface UseVoiceSessionOptions {
  channelId: string;
  creatorName: string;
  onTranscriptUpdate?: (userText: string, aiText: string) => void;
}

export function useVoiceSession({ channelId, creatorName, onTranscriptUpdate }: UseVoiceSessionOptions) {
  const { user } = useAuth();
  const [state, setState] = useState<VoiceSessionState>({
    status: 'idle',
    transcript: '',
    aiTranscript: '',
    error: null,
    durationSeconds: 0,
  });

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<number | null>(null);
  const isCleaningUpRef = useRef<boolean>(false);
  // Track conversation history for persistence
  const conversationHistoryRef = useRef<Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }>>([]);

  const cleanup = useCallback(async (trackUsage = true) => {
    if (isCleaningUpRef.current) return;
    isCleaningUpRef.current = true;

    console.log('[Voice] Cleaning up session...');

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (trackUsage && startTimeRef.current > 0 && user) {
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      if (duration > 5) {
        try {
          // Track usage
          await supabase.functions.invoke('voice-realtime', {
            body: {
              action: 'track_usage',
              user_id: user.id,
              duration_seconds: duration,
            },
          });

          // Save conversation to database if there's content
          if (conversationHistoryRef.current.length > 0) {
            await supabase.from('voice_conversations').insert({
              user_id: user.id,
              channel_id: channelId,
              creator_name: creatorName,
              duration_seconds: duration,
              transcript: conversationHistoryRef.current,
            });
            console.log('[Voice] Conversation saved to database');
          }
        } catch (e) {
          console.error('[Voice] Failed to save conversation:', e);
        }
      }
    }
    startTimeRef.current = 0;
    conversationHistoryRef.current = [];

    if (dataChannelRef.current) {
      try {
        dataChannelRef.current.close();
      } catch (e) { /* ignore */ }
      dataChannelRef.current = null;
    }

    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close();
      } catch (e) { /* ignore */ }
      peerConnectionRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) { /* ignore */ }
      });
      mediaStreamRef.current = null;
    }

    if (audioElementRef.current) {
      try {
        audioElementRef.current.pause();
        audioElementRef.current.srcObject = null;
      } catch (e) { /* ignore */ }
      audioElementRef.current = null;
    }

    setState(prev => ({
      ...prev,
      status: 'idle',
      durationSeconds: 0,
    }));

    isCleaningUpRef.current = false;
  }, [user]);

  const checkAccess = useCallback(async (): Promise<boolean> => {
    if (!user) {
      toast.error('Please sign in to use voice chat');
      return false;
    }

    try {
      const { data, error } = await supabase.functions.invoke('voice-realtime', {
        body: {
          action: 'check_access',
          user_id: user.id,
        },
      });

      if (error) {
        console.error('[Voice] Access check error:', error);
        toast.error('Failed to check voice access');
        return false;
      }

      if (!data.allowed) {
        toast.error('Voice rate limit reached. Try again later.');
        return false;
      }

      return true;
    } catch (e) {
      console.error('[Voice] Access check failed:', e);
      return false;
    }
  }, [user]);

  const getContext = useCallback(async (): Promise<string> => {
    if (!user) return '';

    try {
      const { data, error } = await supabase.functions.invoke('voice-realtime', {
        body: {
          action: 'get_context',
          user_id: user.id,
          channel_id: channelId,
        },
      });

      if (error || !data) {
        console.warn('[Voice] Failed to get context:', error);
        return '';
      }

      return data.context || '';
    } catch (e) {
      console.error('[Voice] Context retrieval failed:', e);
      return '';
    }
  }, [user, channelId]);

  const startSession = useCallback(async () => {
    if (!user) {
      toast.error('Please sign in to use voice chat');
      return;
    }

    // Only allow starting from idle or error states
    const STARTABLE_STATES = ['idle', 'error'] as const;
    if (!STARTABLE_STATES.includes(state.status as any)) {
      console.log('[Voice] Session already active, ignoring start');
      return;
    }

    setState(prev => ({ ...prev, status: 'connecting', error: null, transcript: '', aiTranscript: '' }));

    try {
      const hasAccess = await checkAccess();
      if (!hasAccess) {
        setState(prev => ({ ...prev, status: 'idle' }));
        return;
      }

      console.log('[Voice] Requesting microphone...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;
      console.log('[Voice] Microphone access granted');

      console.log('[Voice] Fetching RAG context...');
      const context = await getContext();
      console.log('[Voice] Context fetched, length:', context.length);

      console.log('[Voice] Creating session with backend...');
      const { data: sessionData, error: sessionError } = await supabase.functions.invoke('voice-realtime', {
        body: {
          action: 'create_session',
          user_id: user.id,
          channel_id: channelId,
          creator_name: creatorName,
          context: context,
        },
      });

      if (sessionError || !sessionData?.ephemeralKey) {
        console.error('[Voice] Session creation failed:', sessionError, sessionData);
        throw new Error(sessionData?.error || sessionError?.message || 'Failed to create voice session');
      }

      console.log('[Voice] Got ephemeral key, expires at:', sessionData.expiresAt);

      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      audioElementRef.current = audioEl;

      // WebRTC connection state handlers
      pc.oniceconnectionstatechange = () => {
        console.log('[Voice] ICE connection state:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
          setState(prev => ({ 
            ...prev, 
            status: 'error', 
            error: 'Connection lost. Please try again.' 
          }));
          cleanup(false);
        }
      };

      pc.onconnectionstatechange = () => {
        console.log('[Voice] Connection state:', pc.connectionState);
        if (pc.connectionState === 'failed') {
          setState(prev => ({ 
            ...prev, 
            status: 'error', 
            error: 'Connection failed. Please check your network.' 
          }));
          cleanup(false);
        }
      };

      pc.ontrack = (event) => {
        console.log('[Voice] Received remote audio track');
        audioEl.srcObject = event.streams[0];
      };

      stream.getAudioTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      const dc = pc.createDataChannel('oai-events');
      dataChannelRef.current = dc;

      dc.onopen = () => {
        console.log('[Voice] Data channel opened');
        setState(prev => ({ ...prev, status: 'listening' }));
      };

      dc.onclose = () => {
        console.log('[Voice] Data channel closed');
      };

      dc.onerror = (error) => {
        console.error('[Voice] Data channel error:', error);
        setState(prev => ({ 
          ...prev, 
          status: 'error', 
          error: 'Data channel error occurred.' 
        }));
      };

      dc.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleRealtimeEvent(data);
        } catch (e) {
          console.warn('[Voice] Failed to parse event:', e);
        }
      };

      console.log('[Voice] Creating SDP offer...');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === 'complete') {
          resolve();
        } else {
          const checkState = () => {
            if (pc.iceGatheringState === 'complete') {
              pc.removeEventListener('icegatheringstatechange', checkState);
              resolve();
            }
          };
          pc.addEventListener('icegatheringstatechange', checkState);
          setTimeout(resolve, 5000);
        }
      });

      console.log('[Voice] Connecting to OpenAI Realtime...');
      
      // Ensure SDP is available before proceeding
      if (!pc.localDescription?.sdp) {
        throw new Error('Failed to create local SDP description');
      }
      
      const baseUrl = 'https://api.openai.com/v1/realtime';
      const model = 'gpt-4o-mini-realtime-preview-2024-12-17';
      
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionData.ephemeralKey}`,
          'Content-Type': 'application/sdp',
        },
        body: pc.localDescription.sdp,
      });

      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text();
        console.error('[Voice] OpenAI SDP exchange failed:', sdpResponse.status, errorText);
        throw new Error(`OpenAI connection failed: ${errorText}`);
      }

      const sdpAnswer = await sdpResponse.text();
      console.log('[Voice] Got SDP answer, setting remote description...');
      
      await pc.setRemoteDescription({
        type: 'answer',
        sdp: sdpAnswer,
      });

      startTimeRef.current = Date.now();
      durationIntervalRef.current = window.setInterval(() => {
        setState(prev => ({
          ...prev,
          durationSeconds: Math.floor((Date.now() - startTimeRef.current) / 1000),
        }));
      }, 1000);

      console.log('[Voice] Session started successfully!');
      toast.success('Voice chat started');

    } catch (error) {
      console.error('[Voice] Session error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start voice session';
      setState(prev => ({ ...prev, status: 'error', error: errorMessage }));
      toast.error(errorMessage);
      await cleanup(false);
    }
  }, [user, channelId, creatorName, checkAccess, getContext, cleanup, state.status]);

  const lastProcessedResponseRef = useRef<string | null>(null);

  const handleRealtimeEvent = useCallback((event: any) => {
    const { type } = event;

    switch (type) {
      case 'session.created':
        console.log('[Voice] Session created:', event.session?.id);
        break;

      case 'session.updated':
        console.log('[Voice] Session updated');
        break;

      case 'input_audio_buffer.speech_started':
        console.log('[Voice] User started speaking');
        // Clear previous transcripts when user starts speaking
        setState(prev => ({ ...prev, status: 'speaking', transcript: '', aiTranscript: '' }));
        break;

      case 'input_audio_buffer.speech_stopped':
        console.log('[Voice] User stopped speaking');
        break;

      case 'conversation.item.input_audio_transcription.completed':
        const userText = event.transcript || '';
        console.log('[Voice] User transcript:', userText);
        // Add to conversation history
        if (userText.trim()) {
          conversationHistoryRef.current.push({
            role: 'user',
            content: userText,
            timestamp: Date.now(),
          });
        }
        setState(prev => {
          const newTranscript = userText;
          onTranscriptUpdate?.(newTranscript, prev.aiTranscript);
          return { ...prev, transcript: newTranscript };
        });
        break;

      case 'response.audio_transcript.delta':
        const deltaText = event.delta || '';
        setState(prev => {
          const newAiTranscript = prev.aiTranscript + deltaText;
          onTranscriptUpdate?.(prev.transcript, newAiTranscript);
          return { ...prev, aiTranscript: newAiTranscript, status: 'connected' };
        });
        break;

      case 'response.audio_transcript.done':
        console.log('[Voice] AI finished speaking');
        // Deduplicate: only process if this is a new response
        const responseId = event.response_id || event.item_id || Date.now().toString();
        if (lastProcessedResponseRef.current === responseId) {
          console.log('[Voice] Skipping duplicate response.audio_transcript.done');
          break;
        }
        lastProcessedResponseRef.current = responseId;
        
        // Add complete AI response to conversation history
        setState(prev => {
          if (prev.aiTranscript.trim()) {
            conversationHistoryRef.current.push({
              role: 'assistant',
              content: prev.aiTranscript,
              timestamp: Date.now(),
            });
          }
          // Keep transcripts visible, only clear on next user speech
          return { ...prev, status: 'listening' };
        });
        break;

      case 'response.done':
        setState(prev => ({ ...prev, status: 'listening' }));
        break;

      case 'error':
        console.error('[Voice] Realtime error:', event.error);
        setState(prev => ({ 
          ...prev, 
          status: 'error', 
          error: event.error?.message || 'Voice session error' 
        }));
        break;

      default:
        if (!type.startsWith('response.audio.')) {
          console.log('[Voice] Event:', type);
        }
    }
  }, [onTranscriptUpdate]);

  const stopSession = useCallback(async () => {
    console.log('[Voice] Stopping session...');
    await cleanup(true);
    toast.info('Voice chat ended');
  }, [cleanup]);

  const clearTranscripts = useCallback(() => {
    setState(prev => ({ ...prev, transcript: '', aiTranscript: '' }));
  }, []);

  useEffect(() => {
    return () => {
      cleanup(false);
    };
  }, []);

  return {
    ...state,
    isActive: state.status !== 'idle' && state.status !== 'error',
    isConnecting: state.status === 'connecting',
    isListening: state.status === 'listening',
    isSpeaking: state.status === 'speaking',
    conversationHistory: conversationHistoryRef.current,
    startSession,
    stopSession,
    clearTranscripts,
  };
}
