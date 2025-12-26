import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage as ChatMessageType } from '../types';
import { LinkIcon, GavelIcon, SpeakerIcon, StopIcon } from './Icons';
import ReactMarkdown from 'react-markdown';
import { generateSpeech } from '../services/geminiService';

interface ChatMessageProps {
  message: ChatMessageType;
}

// Utility to decode base64 string
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Utility to convert Raw PCM 16-bit to AudioBuffer
function pcmToAudioBuffer(data: Uint8Array, ctx: AudioContext, sampleRate: number = 24000): AudioBuffer {
  // Convert Uint8Array to Int16Array (PCM 16-bit)
  const pcm16 = new Int16Array(data.buffer);
  const frameCount = pcm16.length;
  
  // Create an AudioBuffer (1 channel, 24kHz)
  const audioBuffer = ctx.createBuffer(1, frameCount, sampleRate);
  const channelData = audioBuffer.getChannelData(0);

  // Normalize 16-bit integer to float range [-1.0, 1.0]
  for (let i = 0; i < frameCount; i++) {
    channelData[i] = pcm16[i] / 32768.0;
  }
  
  return audioBuffer;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  const stopAudio = () => {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch (e) {
        // Ignore errors if already stopped
      }
      sourceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsPlaying(false);
  };

  const handleSpeak = async () => {
    if (isPlaying) {
      stopAudio();
      return;
    }

    setIsLoadingAudio(true);
    try {
      // 1. Fetch Audio from Gemini
      const base64Audio = await generateSpeech(message.text);

      // 2. Initialize Audio Context
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass({ sampleRate: 24000 }); // Gemini TTS is 24kHz
      audioContextRef.current = ctx;

      // 3. Decode Base64 to Raw Bytes
      const audioBytes = decode(base64Audio);
      
      // 4. Manually Decode Raw PCM to AudioBuffer
      // ctx.decodeAudioData fails because the data has no WAV/MP3 header
      const audioBuffer = pcmToAudioBuffer(audioBytes, ctx);

      // 5. Play Audio
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      
      source.onended = () => {
        setIsPlaying(false);
        sourceRef.current = null;
        // Optionally close context to free resources, but keeping it open is okay if reused. 
        // For simplicity and to ensure clean state, we might close it or just reset state.
        // Here we just update state.
      };

      source.start(0);
      sourceRef.current = source;
      setIsPlaying(true);

    } catch (error) {
      console.error("Error playing audio:", error);
      alert("No se pudo reproducir el audio.");
    } finally {
      setIsLoadingAudio(false);
    }
  };

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] md:max-w-2xl rounded-2xl p-6 shadow-sm relative group ${
        isUser 
          ? 'bg-slate-800 text-white rounded-br-none' 
          : 'bg-white border border-slate-100 rounded-bl-none text-slate-800'
      }`}>
        <div className="flex items-center justify-between gap-2 mb-3 border-b border-opacity-20 border-gray-400 pb-2">
          <div className="flex items-center gap-2">
            {isUser ? (
               <span className="font-semibold text-sm tracking-wider uppercase text-slate-300">Tú</span>
            ) : (
              <>
                <div className="bg-indigo-100 p-1.5 rounded-lg text-indigo-700">
                   <GavelIcon className="w-4 h-4" />
                </div>
                <span className="font-serif font-bold text-slate-900">Leyesamano</span>
              </>
            )}
          </div>

          {!isUser && (
            <button 
              onClick={handleSpeak}
              disabled={isLoadingAudio}
              className={`text-slate-400 hover:text-indigo-600 transition-colors p-1 rounded-full hover:bg-slate-100 ${isLoadingAudio ? 'opacity-50 cursor-wait' : ''}`}
              title="Escuchar respuesta con Gemini AI"
            >
              {isLoadingAudio ? (
                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              ) : isPlaying ? (
                <StopIcon className="w-4 h-4" />
              ) : (
                <SpeakerIcon className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
        
        <div className={`prose prose-sm md:prose-base ${isUser ? 'prose-invert' : 'prose-slate'} max-w-none leading-relaxed`}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.text}</p>
          ) : (
             <ReactMarkdown 
                components={{
                    h1: ({node, ...props}) => <h1 className="text-xl font-bold font-serif mb-2" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-lg font-bold font-serif mb-2 mt-4" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-md font-bold font-serif mb-1 mt-3" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4 space-y-1" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-4 space-y-1" {...props} />,
                    li: ({node, ...props}) => <li className="pl-1" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-semibold text-indigo-900" {...props} />,
                    p: ({node, ...props}) => <p className="mb-4 text-slate-700" {...props} />
                }}
             >
                {message.text}
             </ReactMarkdown>
          )}
        </div>

        {/* Sources Section for AI responses */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1">
              <LinkIcon className="w-3 h-3" /> Fuentes encontradas
            </h4>
            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
              {message.sources.map((source, idx) => (
                <a 
                  key={idx} 
                  href={source.uri} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors text-xs text-slate-600 truncate"
                >
                  <div className="w-6 h-6 flex-shrink-0 bg-white rounded-full border border-slate-200 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                    {idx + 1}
                  </div>
                  <span className="truncate">{source.title || source.uri}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};