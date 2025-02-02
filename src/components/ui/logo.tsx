'use client';

import { useTheme } from 'next-themes';
import Image from 'next/image';
import { useEffect, useState } from 'react';

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export function Logo({ className = '', width = 180, height = 40 }: LogoProps) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div 
        className={`${className} bg-muted`}
        style={{ width, height }}
      />
    );
  }

  const logoSrc = resolvedTheme === 'dark' ? '/images/logo-light.svg' : '/images/logo-dark.svg';
  
  return (
    <div className={className}>
      <Image
        src={logoSrc}
        alt="Company Logo"
        width={width}
        height={height}
        className="transition-opacity duration-300"
        priority
      />
    </div>
  );
} 