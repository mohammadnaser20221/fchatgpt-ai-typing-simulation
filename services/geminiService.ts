import { GoogleGenAI, Chat } from "@google/genai";
import type { Message } from '../types';

let ai: GoogleGenAI | null = null;
const getAI = () => {
  if (!ai) {
     if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable not set");
    }
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return ai;
}

export const startChat = (history: Message[]): Chat => {
  const genAI = getAI();
  const chat = genAI.chats.create({
    model: 'gemini-2.5-flash',
    history: history,
  });
  return chat;
};
