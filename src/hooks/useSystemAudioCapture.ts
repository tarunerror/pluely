import { useState, useRef, useCallback } from "react";

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

export const useSystemAudioCapture = () => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const getAudioDevices = useCallback(async () => {
    try {
      // First request permission to enumerate devices
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Audio Input ${device.deviceId.slice(0, 8)}`,
          kind: device.kind as MediaDeviceKind,
        }));
      
      setAudioDevices(audioInputs);
      
      // Try to get system audio via getDisplayMedia (screen capture with audio)
      // This is the closest we can get to system audio in browsers
      if ('getDisplayMedia' in navigator.mediaDevices) {
        setAudioDevices(prev => [
          ...prev,
          {
            deviceId: 'system-audio',
            label: 'System Audio (requires screen share)',
            kind: 'audioinput' as MediaDeviceKind,
          }
        ]);
      }
      
      setError(null);
    } catch (err) {
      console.error('Failed to get audio devices:', err);
      setError('Failed to access audio devices. Please check permissions.');
    }
  }, []);

  const startCapture = useCallback(async (onAudioData?: (audioBlob: Blob) => void) => {
    try {
      setError(null);
      let stream: MediaStream;

      if (selectedDevice === 'system-audio') {
        // Capture system audio via screen share
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: false,
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          } as any,
        });
      } else {
        // Capture from specific audio input device
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: selectedDevice ? { exact: selectedDevice } : undefined,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
      }

      streamRef.current = stream;
      chunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (onAudioData) {
          onAudioData(audioBlob);
        }
        chunksRef.current = [];
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsCapturing(true);
    } catch (err) {
      console.error('Failed to start audio capture:', err);
      setError('Failed to start audio capture. Please check permissions.');
      setIsCapturing(false);
    }
  }, [selectedDevice]);

  const stopCapture = useCallback(() => {
    if (mediaRecorderRef.current && isCapturing) {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setIsCapturing(false);
    mediaRecorderRef.current = null;
  }, [isCapturing]);

  return {
    isCapturing,
    audioDevices,
    selectedDevice,
    setSelectedDevice,
    error,
    getAudioDevices,
    startCapture,
    stopCapture,
  };
};