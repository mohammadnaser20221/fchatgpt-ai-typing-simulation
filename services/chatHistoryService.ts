
import type { Message } from '../types';

export const loadHistory = (email: string): Message[] => {
  const history = localStorage.getItem(`chat-history-${email}`);
  return history ? JSON.parse(history) : [];
};

export const saveHistory = (email: string, history: Message[]): void => {
  localStorage.setItem(`chat-history-${email}`, JSON.stringify(history));
};
