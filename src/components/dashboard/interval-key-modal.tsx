'use client';

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { IntervalsAPI } from "@/lib/intervals-api";
import { Eye, EyeOff } from "lucide-react";

interface IntervalKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IntervalKeyModal({ open, onOpenChange }: IntervalKeyModalProps) {
  const { data: session } = useSession();
  const [apiKey, setApiKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const { toast } = useToast();

  // Load saved key on mount
  useEffect(() => {
    if (session?.user?.email) {
      const storageKey = `intervals_api_key_${session.user.email}`;
      const savedKey = localStorage.getItem(storageKey);
      if (savedKey) {
        setApiKey(savedKey);
      }
    }
  }, [session?.user?.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter your Interval API key",
      });
      return;
    }

    if (!session?.user?.email) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to save an API key",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('Starting API key validation...');
      
      // Test connection first
      const intervalsApi = new IntervalsAPI(apiKey);
      await intervalsApi.testConnection();

      console.log('API connection test successful, saving key...');

      // If connection successful, save the key with user ID
      const storageKey = `intervals_api_key_${session.user.email}`;
      try {
        localStorage.setItem(storageKey, apiKey);
        console.log('API key saved to localStorage');
      } catch (storageError) {
        console.error('Failed to save to localStorage:', storageError);
        throw new Error('Failed to save API key locally');
      }

      // Also save to server
      try {
        const response = await fetch("/api/interval/save-key", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ apiKey }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Server save failed:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData
          });
          throw new Error(errorData.error || 'Failed to save API key to server');
        }

        console.log('API key saved to server successfully');
      } catch (serverError) {
        console.error('Server save error:', serverError);
        // Continue even if server save fails - we have the key in localStorage
        toast({
          variant: "default",
          title: "Warning",
          description: "API key saved locally but failed to sync with server. Some features may be limited.",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Interval API key saved successfully",
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error 
          ? error.message 
          : "Failed to verify API key. Please check your network connection.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    const storageKey = `intervals_api_key_${session?.user?.email}`;
    const savedKey = localStorage.getItem(storageKey);
    if (savedKey) {
      onOpenChange(false);
    } else {
      toast({
        variant: "destructive",
        title: "Required",
        description: "Please enter your Intervals API key to continue.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]" onPointerDownOutside={e => e.preventDefault()} onEscapeKeyDown={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Set Intervals API Key</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3">
              <div className="text-destructive font-medium">
                An API key is required to use this application.
              </div>
              <div className="mt-2 space-y-3 rounded-md bg-muted p-4 text-sm">
                <div className="space-y-2">
                  <p className="font-medium">Follow these steps to get your API key:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-1">
                    <li>Go to Intervals and log into your account</li>
                    <li>Navigate to My Account</li>
                    <li>Find API Access under Options</li>
                    <li>Generate or view your API token (11-character code like: a78828gq6t4) or regenerate your API token</li>
                    <li>Copy and paste your token below</li>
                  </ol>
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-muted-foreground/20"></span>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-muted px-2 text-muted-foreground font-semibold">OR</span>
                    </div>
                  </div>
                  <p>
                    Get your API key directly from{" "}
                    <a 
                      href="https://nathcorp1.intervalsonline.com/account/api/" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-primary hover:underline font-medium"
                    >
                      Intervals API Access Page
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={showKey ? "text" : "password"}
                placeholder="Enter your Interval API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={isSubmitting}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-auto py-1 px-2"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              type="submit"
              disabled={isSubmitting || !session?.user || !apiKey.trim()}
            >
              {isSubmitting ? "Verifying..." : "Save Key"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 