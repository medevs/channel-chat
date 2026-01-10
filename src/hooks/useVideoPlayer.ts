import { useState, useCallback } from "react";
import type { VideoPlayerState, VideoSource } from "@/types/chat";

export function useVideoPlayer() {
  const [state, setState] = useState<VideoPlayerState>(() => ({
    isOpen: false,
    currentVideo: null,
    timestamp: undefined,
  }));

  const openVideo = useCallback((video: VideoSource, timestamp?: number) => {
    setState({
      isOpen: true,
      currentVideo: video,
      timestamp,
    });
  }, []);

  const closeVideo = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  const setTimestamp = useCallback((timestamp: number) => {
    setState(prev => ({
      ...prev,
      timestamp,
    }));
  }, []);

  return {
    ...state,
    openVideo,
    closeVideo,
    setTimestamp,
  };
}
