'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { VersionFooter } from '@/components/ui/version-footer';

export default function LoginPage() {
  return (
    <div className="relative min-h-screen">
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold mb-4">Meeting Time Tracker</h1>
          <Button
            onClick={() => signIn('azure-ad', { callbackUrl: '/dashboard' })}
            className="w-full"
          >
            Sign in with Microsoft
          </Button>
        </div>
      </div>
      <VersionFooter />
    </div>
  );
} 