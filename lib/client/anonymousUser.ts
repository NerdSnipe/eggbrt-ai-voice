'use client';

const STORAGE_KEY = 'eggbrt-anonymous-id';

export function getAnonymousUserId(): string {
  if (typeof window === 'undefined') return '';

  let id = localStorage.getItem(STORAGE_KEY);

  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }

  return id;
}

export function getDisplayName(): string {
  return localStorage.getItem('eggbrt-display-name') || '';
}

export function setDisplayName(name: string): void {
  localStorage.setItem('eggbrt-display-name', name);
}
