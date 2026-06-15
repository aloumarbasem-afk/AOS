import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

const b64ToPcm = (b64: string): Float32Array => {
  const binaryString = atob(b64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const int16Array = new Int16Array(bytes.buffer);
  const float32Array = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / 32768.0;
  }
  return float32Array;
};

const pcmToBase64 = (float32Array: Float32Array): string => {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  const bytes = new Uint8Array(int16Array.buffer);
  let binaryString = '';
  for (let i = 0; i < bytes.length; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }
  return btoa(binaryString);
};

export const LiveVoiceArchitect: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  const connectVoice = useCallback(async () => {
    setIsConnecting(true);
    try {
      const inputCtx = new window.AudioContext({ sampleRate: 16000 });
      const outputCtx = new window.AudioContext({ sampleRate: 24000 });
      inputAudioCtxRef.current = inputCtx;
      outputAudioCtxRef.current = outputCtx;

      const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const source = inputCtx.createMediaStreamSource(stream);
      sourceRef.current = source;
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(inputCtx.destination);

      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN) {
          const base64 = pcmToBase64(e.inputBuffer.getChannelData(0));
          ws.send(JSON.stringify({ audio: base64 }));
        }
      };

      ws.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.audio) {
          const float32Data = b64ToPcm(msg.audio);
          const buffer = outputCtx.createBuffer(1, float32Data.length, outputCtx.sampleRate);
          buffer.getChannelData(0).set(float32Data);

          const sourceNode = outputCtx.createBufferSource();
          sourceNode.buffer = buffer;
          sourceNode.connect(outputCtx.destination);

          if (nextStartTimeRef.current < outputCtx.currentTime) {
            nextStartTimeRef.current = outputCtx.currentTime;
          }
          sourceNode.start(nextStartTimeRef.current);
          nextStartTimeRef.current += buffer.duration;
        }
        if (msg.interrupted) {
          nextStartTimeRef.current = outputCtx.currentTime;
          // Note: Full interruption handling would involve storing nodes and calling .stop()
        }
      };

      ws.onclose = () => {
        disconnectVoice();
      };
      
    } catch (err) {
      console.error("Failed to start voice session", err);
      disconnectVoice();
    }
  }, []);

  const disconnectVoice = useCallback(() => {
    setIsConnected(false);
    setIsConnecting(false);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close().catch(() => {});
      inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close().catch(() => {});
      outputAudioCtxRef.current = null;
      nextStartTimeRef.current = 0;
    }
  }, []);

  useEffect(() => {
    return () => disconnectVoice();
  }, [disconnectVoice]);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={isConnected ? disconnectVoice : connectVoice}
        disabled={isConnecting}
        className={`flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-all duration-300 backdrop-blur-md border cursor-pointer hover:scale-[1.03] active:scale-[0.98] ${
          isConnected 
            ? 'bg-rose-500/20 shadow-rose-500/20 border-rose-500/50 hover:bg-rose-500/30' 
            : 'bg-indigo-500/20 shadow-indigo-500/20 border-indigo-500/50 hover:bg-indigo-500/30'
        }`}
      >
        {isConnecting ? (
          <Loader2 className="w-5 h-5 animate-spin text-white" />
        ) : isConnected ? (
          <div className="relative">
            <span className="absolute -inset-1 bg-rose-500 opacity-40 rounded-full blur animate-pulse" />
            <MicOff className="w-5 h-5 text-rose-400 relative z-10" />
          </div>
        ) : (
          <Mic className="w-5 h-5 text-indigo-400" />
        )}
        <span className="font-mono text-xs uppercase tracking-wider text-white font-bold hidden md:inline-block">
          {isConnecting ? 'Connecting...' : isConnected ? 'End Architect Call' : 'Talk to Architect'}
        </span>
      </button>
    </div>
  );
};
