import React from 'react';
import { GenerationDetails } from '@/lib/videoGenieApi';
import { useVoices } from '@/hooks/useVoices';
import { FiGlobe, FiUser, FiMaximize, FiSpeaker } from 'react-icons/fi';

const PromptStep = ({ generation }: { generation: GenerationDetails | null }) => {
    const { languages, getVoiceById } = useVoices();

    // Get languageCode and voiceId from generation options or initialParams
    const languageCode = generation?.options?.languageCode || generation?.initialParams?.options?.languageCode || generation?.language || generation?.initialParams?.language;
    const voiceId = generation?.options?.voiceId || generation?.initialParams?.options?.voiceId;

    // Get displayName for language
    const languageDisplay = languageCode && languages[languageCode]?.displayName
        ? languages[languageCode].displayName
        : languageCode || 'Unknown';

    // Get voice info
    const voice = voiceId ? getVoiceById(voiceId) : undefined;
    const voiceName = voice?.voiceId || voiceId || 'Unknown';
    const voiceGender = voice?.gender || 'Unknown';

    return (
        <div className="space-y-4 max-w-4xl mx-auto">
            <h2 className="text-lg font-semibold text-white flex justify-between items-center">
                Step 1
                <span className="text-zinc-400 text-sm">Prompt Input</span>
            </h2>
            <div className="mt-6">
                <p className="text-zinc-300 mb-2">Your video prompt:</p>
                <p className="text-white font-medium">
                    {generation?.prompt || generation?.initialParams?.prompt || 'No prompt available'}
                </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
                <div className="bg-zinc-900 rounded-lg flex-1 min-w-[160px] p-4 pl-0">
                    <div className="flex flex-col items-start gap-1">
                        <p className="text-zinc-300 text-sm flex items-center"><FiGlobe className="mr-2 text-blue-400" />Language:</p>
                        <p className="text-white font-medium">{languageDisplay}</p>
                    </div>
                </div>
                <div className="bg-zinc-900 rounded-lg flex-1 min-w-[160px] p-4">
                    <div className="flex flex-col items-start gap-1">
                        <p className="text-zinc-300 text-sm flex items-center"><FiUser className="mr-2 text-green-400" />Voice:</p>
                        <p className="text-white font-medium">{voiceName}</p>
                    </div>
                </div>
                <div className="bg-zinc-900 rounded-lg flex-1 min-w-[160px] p-4">
                    <div className="flex flex-col items-start gap-1">
                        <p className="text-zinc-300 text-sm flex items-center"><FiSpeaker className="mr-2 text-pink-400" />Voice Gender:</p>
                        <p className="text-white font-medium">{voiceGender}</p>
                    </div>
                </div>
                <div className="bg-zinc-900 rounded-lg flex-1 min-w-[160px] p-4 pr-0">
                    <div className="flex flex-col items-start gap-1">
                        <p className="text-zinc-300 text-sm flex items-center"><FiMaximize className="mr-2 text-yellow-400" />Aspect Ratio:</p>
                        <p className="text-white font-medium">
                            {generation?.options?.aspectRatio || generation?.initialParams?.options?.aspectRatio || '16:9'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PromptStep; 