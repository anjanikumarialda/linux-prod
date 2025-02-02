import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Meeting } from './types'
import { format, addMinutes } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getIntervalsApiKey(userEmail: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(`intervals_api_key_${userEmail}`);
}

export function setIntervalsApiKey(userEmail: string, apiKey: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`intervals_api_key_${userEmail}`, apiKey);
}

export function removeIntervalsApiKey(userEmail: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`intervals_api_key_${userEmail}`);
}

/**
 * Extracts duration in hours from attendance string (e.g., "2 minutes 34 seconds" -> 0.04)
 */
export function extractDurationFromAttendance(attendance: string): number {
  const minutes = attendance.match(/(\d+)\s*minute/i)?.[1] || '0';
  const seconds = attendance.match(/(\d+)\s*second/i)?.[1] || '0';
  
  const totalMinutes = parseInt(minutes) + (parseInt(seconds) / 60);
  return Number((totalMinutes / 60).toFixed(2)); // Convert to hours with 2 decimal places
}

/**
 * Calculates duration in hours between two ISO date strings
 */
export function calculateDurationFromScheduled(startDateTime: string, endDateTime: string): number {
  const start = new Date(startDateTime);
  const end = new Date(endDateTime);
  const durationMs = end.getTime() - start.getTime();
  const durationHours = durationMs / (1000 * 60 * 60);
  return Number(durationHours.toFixed(2));
}

// Constants for cache keys
export const LAST_MEETING_CACHE_KEY = 'last_posted_meeting';

// Cache management functions for last posted meeting
export const cacheLastMeeting = (meeting: Meeting) => {
  try {
    const cached = {
      meeting,
      timestamp: new Date().toISOString()
    };
    sessionStorage.setItem(LAST_MEETING_CACHE_KEY, JSON.stringify(cached));
    // Dispatch a custom event for real-time updates
    window.dispatchEvent(new CustomEvent('meetingPosted', { detail: cached }));
  } catch (error) {
    console.error('Error caching last meeting:', error);
  }
};

export const getLastMeetingFromCache = () => {
  try {
    const cached = sessionStorage.getItem(LAST_MEETING_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Error getting last meeting from cache:', error);
    return null;
  }
};

/**
 * Converts a UTC date to IST (UTC+5:30)
 * Used when receiving data from external APIs
 */
export function convertToIST(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return addMinutes(dateObj, 330); // 5 hours and 30 minutes ahead of UTC
}

/**
 * Formats a date that is already in IST
 * Only used for display purposes
 */
export function formatToIST(date: Date | string, formatStr: string = 'MMM dd, yyyy hh:mm a'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, formatStr) + ' IST';
}
