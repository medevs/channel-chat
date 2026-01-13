import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Calendar, Video, FileText, Clock, Play, Film, Radio, AlertCircle, CheckCircle, Loader2, XCircle, MessageCircle, RotateCcw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface CreatorData {
  id: string;
  channelId: string;
  channelName: string;
  channelUrl: string;
  avatarUrl: string | null;
  subscriberCount: string | null;
  totalVideos: number;
  indexedVideos: number;
  ingestionStatus: string | null;
  ingestionProgress: number;
  errorMessage: string | null;
  createdAt: string;
  videoImportMode: string;
  videoImportLimit: number | null;
  ingestVideos: boolean;
  ingestShorts: boolean;
  ingestLives: boolean;
}

interface VideoData {
  id: string;
  videoId: string;
  title: string;
  publishedAt: string | null;
  duration: string | null;
  durationSeconds: number | null;
  thumbnailUrl: string | null;
  ingestionMethod: string | null;
  hasTranscript: boolean;
  transcriptStatus: string | null;
}

type SortOrder = 'newest' | 'oldest';

export default function CreatorProfile() {
  const { creatorId } = useParams<{ creatorId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [creator, setCreator] = useState<CreatorData | null>(null);
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [retryingVideoId, setRetryingVideoId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!creatorId) {
      navigate('/chat');
      return;
    }

    async function fetchCreatorData() {
      setIsLoading(true);
      setError(null);

      try {
        // Verify user has access to this creator
        const { data: userCreator, error: accessError } = await supabase
          .from('user_creators')
          .select('channel_id')
          .eq('user_id', user!.id)
          .eq('channel_id', creatorId)
          .maybeSingle();

        if (accessError) throw accessError;
        if (!userCreator) {
          setError('Creator not found or you do not have access.');
          setIsLoading(false);
          return;
        }

        // Fetch creator details
        const { data: channelData, error: channelError } = await supabase
          .from('channels')
          .select('*')
          .eq('id', creatorId)
          .single();

        if (channelError) throw channelError;

        setCreator({
          id: channelData.id,
          channelId: channelData.channel_id,
          channelName: channelData.channel_name,
          channelUrl: channelData.channel_url,
          avatarUrl: channelData.avatar_url,
          subscriberCount: channelData.subscriber_count,
          totalVideos: channelData.total_videos || 0,
          indexedVideos: channelData.indexed_videos || 0,
          ingestionStatus: channelData.ingestion_status,
          ingestionProgress: channelData.ingestion_progress || 0,
          errorMessage: channelData.error_message,
          createdAt: channelData.created_at,
          videoImportMode: channelData.video_import_mode || 'latest',
          videoImportLimit: channelData.video_import_limit,
          ingestVideos: channelData.ingest_videos,
          ingestShorts: channelData.ingest_shorts,
          ingestLives: channelData.ingest_lives,
        });

        // Fetch videos with transcript status
        const { data: videosData, error: videosError } = await supabase
          .from('videos')
          .select(`
            id,
            video_id,
            title,
            published_at,
            duration,
            duration_seconds,
            thumbnail_url,
            ingestion_method,
            transcript_status
          `)
          .eq('channel_id', channelData.channel_id)
          .order('published_at', { ascending: false });

        if (videosError) throw videosError;

        setVideos(
          (videosData || []).map(v => ({
            id: v.id,
            videoId: v.video_id,
            title: v.title,
            publishedAt: v.published_at,
            duration: v.duration,
            durationSeconds: v.duration_seconds,
            thumbnailUrl: v.thumbnail_url,
            ingestionMethod: v.ingestion_method,
            hasTranscript: v.transcript_status === 'completed',
            transcriptStatus: v.transcript_status,
          }))
        );
      } catch (err) {
        console.error('Error fetching creator data:', err);
        setError('Failed to load creator data.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchCreatorData();
  }, [creatorId, user, authLoading, navigate]);

  const handleChatWithCreator = useCallback(() => {
    navigate(`/chat?creator=${creatorId}`);
  }, [navigate, creatorId]);

  const handleRetryVideo = useCallback(async (videoId: string) => {
    if (!user || retryingVideoId) return;
    
    setRetryingVideoId(videoId);
    
    try {
      const { data, error } = await supabase.functions.invoke('retry-video-processing', {
        body: { videoId }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      console.log('Retry response:', data);

      // Immediately update UI to show processing
      setVideos(prevVideos => 
        prevVideos.map(v => 
          v.videoId === videoId 
            ? { ...v, transcriptStatus: 'processing', hasTranscript: false }
            : v
        )
      );

      toast.success('Video processing retry initiated');
      
      // Poll for status updates every 2 seconds
      const pollStatus = async () => {
        try {
          const { data: videoData } = await supabase
            .from('videos')
            .select('transcript_status')
            .eq('video_id', videoId)
            .single();

          if (videoData) {
            const isCompleted = videoData.transcript_status === 'completed';
            const isFailed = videoData.transcript_status === 'failed' || videoData.transcript_status === 'no_transcript';
            
            setVideos(prevVideos => 
              prevVideos.map(v => 
                v.videoId === videoId 
                  ? { 
                      ...v, 
                      transcriptStatus: videoData.transcript_status,
                      hasTranscript: isCompleted
                    }
                  : v
              )
            );

            // Stop polling and clear loading state if completed or failed
            if (isCompleted || isFailed) {
              setRetryingVideoId(null);
              if (isCompleted) {
                toast.success('Video transcript extracted successfully!');
              } else if (isFailed) {
                toast.error('Video processing failed - no transcript available');
              }
              return;
            }
          }

          // Continue polling if still processing
          setTimeout(pollStatus, 2000);
        } catch (pollError) {
          console.error('Error polling video status:', pollError);
          setRetryingVideoId(null);
        }
      };

      // Start polling after 2 seconds
      setTimeout(pollStatus, 2000);
      
    } catch (err) {
      console.error('Error retrying video processing:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to retry video processing';
      toast.error(errorMessage);
      setRetryingVideoId(null);
    }
  }, [user, retryingVideoId]);

  const sortedVideos = useMemo(() => {
    return [...videos].sort((a, b) => {
      const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
  }, [videos, sortOrder]);

  const formatSubscribers = (count: string | null): string => {
    if (!count) return 'Unknown';
    const num = parseInt(count, 10);
    if (isNaN(num)) return count;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M subscribers`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K subscribers`;
    return `${count} subscribers`;
  };

  const formatDuration = (seconds: number | null, duration: string | null): string => {
    if (seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      if (mins >= 60) {
        const hours = Math.floor(mins / 60);
        const remainMins = mins % 60;
        return `${hours}:${remainMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return duration || 'Unknown';
  };

  const getContentType = (method: string | null, durationSeconds: number | null): { label: string; icon: React.ReactNode } => {
    if (method === 'short' || (durationSeconds && durationSeconds <= 60)) {
      return { label: 'Short', icon: <Film className="w-3 h-3" /> };
    }
    if (method === 'live') {
      return { label: 'Live', icon: <Radio className="w-3 h-3" /> };
    }
    return { label: 'Video', icon: <Play className="w-3 h-3" /> };
  };

  const getTranscriptBadge = (hasTranscript: boolean, status: string | null) => {
    if (!hasTranscript) {
      return (
        <Badge variant="outline" className="text-2xs text-muted-foreground">
          No transcript
        </Badge>
      );
    }
    if (status === 'completed') {
      return (
        <Badge variant="outline" className="text-2xs text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20">
          <CheckCircle className="w-2.5 h-2.5 mr-1" />
          Ready
        </Badge>
      );
    }
    if (status === 'failed') {
      return (
        <Badge variant="outline" className="text-2xs text-destructive">
          <XCircle className="w-2.5 h-2.5 mr-1" />
          Failed
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-2xs text-primary">
        <Loader2 className="w-2.5 h-2.5 mr-1 animate-spin" />
        Processing
      </Badge>
    );
  };

  const getIngestionStatusDisplay = (status: string | null, progress: number) => {
    switch (status) {
      case 'completed':
        return { label: 'Completed', color: 'text-emerald-600', icon: <CheckCircle className="w-4 h-4" /> };
      case 'processing':
      case 'pending':
      case 'extracting':
        return { label: `Processing (${progress}%)`, color: 'text-primary', icon: <Loader2 className="w-4 h-4 animate-spin" /> };
      case 'failed':
        return { label: 'Failed', color: 'text-destructive', icon: <XCircle className="w-4 h-4" /> };
      case 'partial':
        return { label: 'Partial', color: 'text-amber-600', icon: <AlertCircle className="w-4 h-4" /> };
      case 'no_captions':
        return { label: 'No Captions', color: 'text-amber-600', icon: <AlertCircle className="w-4 h-4" /> };
      default:
        return { label: 'Unknown', color: 'text-muted-foreground', icon: null };
    }
  };

  const getContentTypesLabel = () => {
    const types = [];
    if (creator?.ingestVideos) types.push('Videos');
    if (creator?.ingestShorts) types.push('Shorts');
    if (creator?.ingestLives) types.push('Live Streams');
    return types.length > 0 ? types.join(', ') : 'None selected';
  };

  const getImportModeLabel = (mode: string) => {
    switch (mode) {
      case 'latest': return 'Latest videos';
      case 'oldest': return 'Oldest videos';
      case 'all': return 'All videos';
      default: return mode;
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-8 w-32" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-48 col-span-1" />
            <Skeleton className="h-48 col-span-2" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error || !creator) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Error</h2>
            <p className="text-muted-foreground mb-4">{error || 'Creator not found.'}</p>
            <Button onClick={() => navigate('/chat')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Chat
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const ingestionStatus = getIngestionStatusDisplay(creator.ingestionStatus, creator.ingestionProgress);
  const skippedVideos = Math.max(0, creator.totalVideos - creator.indexedVideos);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/chat')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl md:text-2xl font-display font-semibold">Creator Profile</h1>
        </div>

        {/* Creator Overview & Video Coverage */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Creator Overview */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Creator Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={creator.avatarUrl || undefined} alt={creator.channelName} />
                  <AvatarFallback className="text-xl font-display">{creator.channelName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold truncate">{creator.channelName}</h2>
                  <p className="text-sm text-muted-foreground">{formatSubscribers(creator.subscriberCount)}</p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`flex items-center gap-1.5 ${ingestionStatus.color}`}>
                    {ingestionStatus.icon}
                    {ingestionStatus.label}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Added</span>
                  <span>{format(new Date(creator.createdAt), 'MMM d, yyyy')}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Channel Videos</span>
                  <span>{creator.totalVideos}</span>
                </div>

                <a
                  href={creator.channelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-primary hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View on YouTube
                </a>
              </div>

              <Button 
                onClick={handleChatWithCreator}
                className="w-full mt-4"
                size="sm"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat with Creator
              </Button>

              {creator.errorMessage && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs">
                  {creator.errorMessage}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Video Coverage Summary */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Video Coverage Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                    <Video className="w-3.5 h-3.5" />
                    Total Available
                  </div>
                  <p className="text-2xl font-semibold">{creator.totalVideos}</p>
                </div>

                <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                  <div className="flex items-center gap-2 text-emerald-600 text-xs mb-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Indexed
                  </div>
                  <p className="text-2xl font-semibold text-emerald-600">{creator.indexedVideos}</p>
                </div>

                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Skipped
                  </div>
                  <p className="text-2xl font-semibold">{skippedVideos}</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Content Types</span>
                  <span>{getContentTypesLabel()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Import Mode</span>
                  <span>{getImportModeLabel(creator.videoImportMode)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Import Limit</span>
                  <span>{creator.videoImportLimit || 'Unlimited'}</span>
                </div>
              </div>

              {skippedVideos > 0 && (
                <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                  <strong>{skippedVideos} videos</strong> were not indexed due to import limits or missing captions.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Indexed Videos List */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Indexed Videos ({videos.length})
              </CardTitle>
              <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {videos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No videos indexed yet.</p>
                {creator.ingestionStatus === 'processing' && (
                  <p className="text-sm mt-1">Indexing in progress...</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {sortedVideos.map((video) => {
                  const contentType = getContentType(video.ingestionMethod, video.durationSeconds);
                  return (
                    <div
                      key={video.id}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                    >
                      {video.thumbnailUrl ? (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-24 h-14 object-cover rounded shrink-0"
                        />
                      ) : (
                        <div className="w-24 h-14 bg-muted rounded shrink-0 flex items-center justify-center">
                          <Video className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{video.title}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          {video.publishedAt && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(video.publishedAt), 'MMM d, yyyy')}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDuration(video.durationSeconds, video.duration)}
                          </span>
                          <Badge variant="secondary" className="text-2xs px-1.5 py-0 h-4">
                            {contentType.icon}
                            <span className="ml-1">{contentType.label}</span>
                          </Badge>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {getTranscriptBadge(video.hasTranscript, video.transcriptStatus)}
                        {(video.transcriptStatus === 'failed' || video.transcriptStatus === 'no_transcript' || (!video.hasTranscript && video.transcriptStatus !== 'processing')) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRetryVideo(video.videoId)}
                            disabled={retryingVideoId === video.videoId}
                            className="h-6 px-2 text-xs"
                          >
                            {retryingVideoId === video.videoId ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <RotateCcw className="w-3 h-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
