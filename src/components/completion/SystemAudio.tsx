import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MonitorSpeakerIcon, MicIcon, Square, PlayCircle, AlertCircle } from "lucide-react";
import { useSystemAudioCapture } from "@/hooks";
import { UseCompletionReturn } from "@/types";
import { fetchSTT } from "@/lib";
import { useApp } from "@/contexts";

interface SystemAudioProps {
  setState: UseCompletionReturn["setState"];
}

export const SystemAudio = ({ setState }: SystemAudioProps) => {
  const {
    isCapturing,
    audioDevices,
    selectedDevice,
    setSelectedDevice,
    error,
    getAudioDevices,
    startCapture,
    stopCapture,
  } = useSystemAudioCapture();

  const { selectedSttProvider, allSttProviders } = useApp();
  const [isTranscribing, setIsTranscribing] = useState(false);

  useEffect(() => {
    getAudioDevices();
  }, [getAudioDevices]);

  const handleStartCapture = async () => {
    if (!selectedDevice) {
      setState((prev: any) => ({
        ...prev,
        error: "Please select an audio source first.",
      }));
      return;
    }

    if (!selectedSttProvider.provider || !selectedSttProvider.apiKey) {
      setState((prev: any) => ({
        ...prev,
        error: "Please configure a speech-to-text provider in settings first.",
      }));
      return;
    }

    await startCapture(async (audioBlob) => {
      // Convert audio to transcription when capture stops
      if (audioBlob.size > 0) {
        try {
          setIsTranscribing(true);
          
          // Get the provider configuration
          const providerConfig = allSttProviders.find(
            (p) => p.id === selectedSttProvider.provider
          );

          if (!providerConfig) {
            setState((prev: any) => ({
              ...prev,
              error: "Speech provider configuration not found. Please check your settings.",
            }));
            return;
          }

          const transcription = await fetchSTT({
            provider: providerConfig,
            apiKey: selectedSttProvider.apiKey,
            audio: audioBlob,
          });
          if (transcription) {
            setState((prev: any) => ({
              ...prev,
              input: prev.input + (prev.input ? " " : "") + transcription,
            }));
          }
        } catch (err) {
          console.error("Failed to transcribe audio:", err);
          setState((prev: any) => ({
            ...prev,
            error: "Failed to transcribe audio. Please try again.",
          }));
        } finally {
          setIsTranscribing(false);
        }
      }
    });
  };

  const handleStopCapture = () => {
    stopCapture();
  };

  return (
    <Card className="w-80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MonitorSpeakerIcon className="h-4 w-4" />
          System Audio Capture
        </CardTitle>
        <CardDescription>
          Capture and transcribe audio from your system, applications, or microphone
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Audio Source</label>
          <Select
            value={selectedDevice}
            onValueChange={setSelectedDevice}
            disabled={isCapturing}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select audio source" />
            </SelectTrigger>
            <SelectContent>
              {audioDevices.map((device) => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  <div className="flex items-center gap-2">
                    {device.deviceId === 'system-audio' ? (
                      <MonitorSpeakerIcon className="h-4 w-4" />
                    ) : (
                      <MicIcon className="h-4 w-4" />
                    )}
                    {device.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          {!isCapturing ? (
            <Button
              onClick={handleStartCapture}
              disabled={!selectedDevice || isTranscribing}
              className="flex-1"
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              Start Capture
            </Button>
          ) : (
            <Button
              onClick={handleStopCapture}
              variant="destructive"
              className="flex-1"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop Capture
            </Button>
          )}

          <Button
            onClick={getAudioDevices}
            variant="outline"
            disabled={isCapturing}
          >
            Refresh
          </Button>
        </div>

        {isCapturing && (
          <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-md">
            <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
            <p className="text-sm">Recording audio... Stop to transcribe</p>
          </div>
        )}

        {isTranscribing && (
          <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
            <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Transcribing audio...</p>
          </div>
        )}

        {selectedDevice === 'system-audio' && (
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              <strong>Note:</strong> System audio capture requires screen sharing permission. 
              When you start capture, your browser will ask to share your screen - you can 
              choose to share audio only.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};