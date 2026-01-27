import React from 'react';
import CustomVideoPlayer from './CustomVideoPlayer';

export default function VideoPlayerScreen({ route, navigation }: any) {
  const { playbackId, title, contentId, contentType, episodeId } = route.params;

  return (
    <CustomVideoPlayer
      playbackId={playbackId}
      title={title}
      contentId={contentId}
      contentType={contentType}
      episodeId={episodeId}
      onBack={() => navigation.goBack()}
    />
  );
}
