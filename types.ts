
export interface User {
  email: string;
}

export interface Message {
  role: 'user' | 'model';
  parts: [{ text: string }];
}
