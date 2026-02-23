import React, { useState } from 'react';
import { FiDownload, FiInfo, FiLoader } from 'react-icons/fi';
import { GenerationDetails } from '@/lib/videoGenieApi';
import Button from '@/components/Button';
import { Download, PartyPopper, Plus, ShareIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

const PreviewDownloadStep = ({ generation }: { generation: GenerationDetails | null }) => {
  const videoUrl = generation?.finalVideo?.videoUrl;
  const prompt = generation?.prompt || generation?.initialParams?.prompt || 'No prompt available';
  const summary = generation?.script?.content || 'No summary available.';
  const router = useRouter();

  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);

  const handleDownload = () => {
    if (videoUrl) {
      const link = document.createElement("a");
      link.href = videoUrl;
      link.download = `video-${generation?.generationId}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold flex justify-center items-center w-full mt-4">
        <span className='bg-gradient-to-r from-cyan-500 via-blue-400 to-blue-500 bg-clip-text text-transparent'>Your Video is Ready</span>&nbsp;🎉
      </h1>
      <div className="bg-zinc-900 rounded-lg p-6 pt-0 flex flex-col items-center justify-center w-full max-w-xl mx-auto">
        {videoUrl ? (
          <>
            {videoError ? (
              <div className="text-red-500 mt-4 my-8 text-center">
                Failed to load video. Please try again later or contact support.
              </div>
            ) : (
              <>
                {videoLoading && (
                  <div className="flex flex-col items-center justify-center min-h-[280px] min-w-[280px] mb-6">
                    <FiLoader className="animate-spin text-4xl text-white-400 mb-2" />
                    <span className="text-zinc-400">Loading video...</span>
                  </div>
                )}
                <video
                  controls
                  className={`min-h-[280px] max-h-[480px] min-w-[280px] rounded shadow-lg shadow-zinc-900/50 mb-6 rounded-md ${videoLoading ? 'hidden' : ''}`}
                  onLoadedData={() => setVideoLoading(false)}
                  onError={() => setVideoError(true)}
                >
                  <source src={videoUrl} type="video/mp4" />
                  Your browser does not support the video element.
                </video>
              </>
            )}
            <div className="flex gap-4 justify-center flex-wrap">
              <Button
                onClick={() => router.push("/studio/create")}
                className="gap-1"
              >
                <Plus size={16} /> Create New Video
              </Button>
              {!videoError && (
                <>
                  <Button
                    onClick={handleDownload}
                    variant="secondary"
                    className="gap-2"
                  >
                    <Download size={16} /> Download Video
                  </Button>
                  <Button
                    onClick={() => router.push("/studio/dashboard")}
                    variant="secondary"
                    className="bg-red-500 hover:bg-red-100 gap-2"
                  >
                    <ShareIcon size={16} /> Share on Youtube
                  </Button>
                </>
              )
              }
            </div>
          </>
        ) : (
          <div className="text-zinc-400">Final video not ready yet.</div>
        )}
      </div>
      <div className="bg-zinc-900 rounded-lg p-6 mt-4">
        <div className="mb-4 flex items-center gap-2">
          <FiInfo className="text-yellow-400" />
          <span className="text-zinc-300 text-base font-semibold">Prompt</span>
        </div>
        <div className="text-white font-medium mb-6">{prompt}</div>
        <div className="mb-4 flex items-center gap-2">
          <FiInfo className="text-green-400" />
          <span className="text-zinc-300 text-base font-semibold">Video Summary</span>
        </div>
        <div className="text-white font-medium whitespace-pre-line">{summary}</div>
      </div>
    </div>
  );
};

export default PreviewDownloadStep; 