'use client';

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Icons } from "@/components/ui/icons";
import { useToast } from "@/components/ui/use-toast";
import { Logo } from "@/components/ui/logo";

export function LoginCard() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      const result = await signIn("azure-ad", {
        callbackUrl: "/dashboard",
        redirect: true,
      });
      
      if (result?.error) {
        toast({
          variant: "destructive",
          title: "Authentication failed",
          description: "Failed to sign in with Microsoft. Please try again.",
        });
      }
    } catch (error) {
      console.error("Login failed:", error);
      toast({
        variant: "destructive",
        title: "Authentication failed",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full border-none shadow-lg">
      <CardHeader className="space-y-3">
        <div className="flex justify-center mb-6">
          <Logo />
        </div>
        <CardTitle className="text-2xl font-bold text-center">Welcome Back</CardTitle>
        <CardDescription className="text-center">
          Sign in with your Nathcorp account to sync Teams meetings with Interval
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleLogin}
          className="w-full h-11 text-base font-medium"
          size="lg"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              <Icons.microsoft className="mr-2 h-4 w-4" />
              Sign in with NathCorp
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
} 