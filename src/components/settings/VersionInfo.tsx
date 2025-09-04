import { useVersion } from "@/hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RocketIcon, KeyboardIcon, MonitorSpeakerIcon, SparklesIcon } from "lucide-react";

export const VersionInfo = () => {
  const { version, isLoading } = useVersion();

  if (isLoading) {
    return null;
  }

  return (
    <Card className="border-0 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <RocketIcon className="h-5 w-5 text-blue-600" />
            Pluely v{version}
          </CardTitle>
          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-md">
            Latest
          </span>
        </div>
        <CardDescription>
          What's new in this release
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-1">
              <KeyboardIcon className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-green-800 dark:text-green-200">
                Global Keyboard Shortcuts
              </h4>
              <p className="text-xs text-muted-foreground">
                Press <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">Ctrl+/</kbd> (or <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">Cmd+/</kbd> on Mac) to quickly show/hide Pluely
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="mt-1">
              <MonitorSpeakerIcon className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-purple-800 dark:text-purple-200">
                System Audio Capture
              </h4>
              <p className="text-xs text-muted-foreground">
                Capture and transcribe audio from meetings, applications, or system sounds
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="mt-1">
              <SparklesIcon className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-orange-800 dark:text-orange-200">
                Enhanced STT Configuration
              </h4>
              <p className="text-xs text-muted-foreground">
                Test connection feature for speech-to-text providers with better validation
              </p>
            </div>
          </div>
        </div>
        
        <div className="pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground text-center">
            🎯 Making AI assistance more powerful and accessible
          </p>
        </div>
      </CardContent>
    </Card>
  );
};