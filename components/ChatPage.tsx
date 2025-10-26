import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import * as chatHistoryService from '../services/chatHistoryService';
import * as geminiService from '../services/geminiService';
import type { Message } from '../types';
import type { Chat } from '@google/genai';

const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-cyan-400" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
    </svg>
);

const GeminiIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
);


const ChatPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState<string>('');
  const chatRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (user) {
      const history = chatHistoryService.loadHistory(user.email);
      setMessages(history);
      chatRef.current = geminiService.startChat(history);
    }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingResponse]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };
  
  const handleNewChat = () => {
    if (!user) return;
    setMessages([]);
    setStreamingResponse('');
    setIsLoading(false);
    chatHistoryService.saveHistory(user.email, []);
    chatRef.current = null;
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user || isLoading) return;

    const prompt = input;
    const userMessage: Message = { role: 'user', parts: [{ text: prompt }] };
    const currentHistory = messages;
    
    if (!chatRef.current) {
        chatRef.current = geminiService.startChat(currentHistory);
    }
    const chatSession = chatRef.current;

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setStreamingResponse('');

    try {
        const result = await chatSession.sendMessageStream({ message: prompt });
        
        let text = '';
        for await (const chunk of result) {
            text += chunk.text;
            setStreamingResponse(text);
        }

        const modelMessage: Message = { role: 'model', parts: [{ text }] };
        const finalMessages = [...currentHistory, userMessage, modelMessage];
        setMessages(finalMessages);
        chatHistoryService.saveHistory(user.email, finalMessages);

    } catch (error) {
        console.error(error);
        const errorMessage: Message = { role: 'model', parts: [{ text: 'An error occurred. Please try again.' }] };
        setMessages(prev => [...prev, errorMessage]);
        const finalMessagesWithError = [...currentHistory, userMessage, errorMessage];
        chatHistoryService.saveHistory(user.email, finalMessagesWithError);
    } finally {
        setIsLoading(false);
        setStreamingResponse('');
    }
  };


  if (!user) {
    return null; // Should be handled by ProtectedRoute
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <header className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700 shadow-md">
        <h1 className="text-xl font-bold text-cyan-400">Gemini Chat</h1>
        <div className="flex items-center space-x-4">
          <span className="text-gray-300 hidden sm:inline">{user.email}</span>
           <button
            onClick={handleNewChat}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-gray-800"
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            New Chat
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-gray-800"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-start gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'model' && <GeminiIcon />}
            <div className={`max-w-xl p-4 rounded-2xl ${msg.role === 'user' ? 'bg-cyan-800 rounded-br-none' : 'bg-gray-700 rounded-bl-none'}`}>
              <p className="whitespace-pre-wrap">{msg.parts[0].text}</p>
            </div>
             {msg.role === 'user' && <UserIcon />}
          </div>
        ))}
        
        {/* Render the streaming response as it comes in */}
        {streamingResponse && (
            <div className="flex items-start gap-4 justify-start">
                <GeminiIcon />
                <div className="max-w-xl p-4 rounded-2xl bg-gray-700 rounded-bl-none">
                    <p className="whitespace-pre-wrap">{streamingResponse}</p>
                </div>
            </div>
        )}

        {/* Show typing indicator only when loading but before streaming has started */}
        {isLoading && !streamingResponse && (
            <div className="flex items-start gap-4 justify-start">
                <GeminiIcon />
                <div className="max-w-xl p-4 rounded-2xl bg-gray-700 rounded-bl-none">
                    <p className="italic text-gray-400">FChatGPT is typing...</p>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      <footer className="p-4 bg-gray-900 border-t border-gray-700">
        <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-full text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-3 bg-cyan-600 rounded-full text-white hover:bg-cyan-700 disabled:bg-cyan-900 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </form>
      </footer>
    </div>
  );
};

export default ChatPage;
