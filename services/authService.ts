
import type { User } from '../types';

const USERS_KEY = 'chat-app-users';
const CURRENT_USER_KEY = 'chat-app-currentUser';

// Helper to get users from localStorage
const getUsers = (): Record<string, string> => {
  const users = localStorage.getItem(USERS_KEY);
  return users ? JSON.parse(users) : {};
};

// Helper to save users to localStorage
const saveUsers = (users: Record<string, string>): void => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const signup = (email: string, password: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => { // Simulate async operation
      const users = getUsers();
      if (users[email]) {
        reject(new Error('User already exists'));
      } else {
        users[email] = password; // In a real app, hash the password
        saveUsers(users);
        resolve();
      }
    }, 500);
  });
};

export const login = (email: string, password: string): Promise<User> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => { // Simulate async operation
      const users = getUsers();
      if (users[email] && users[email] === password) {
        const user: User = { email };
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
        resolve(user);
      } else {
        reject(new Error('Invalid email or password'));
      }
    }, 500);
  });
};

export const logout = (): void => {
  localStorage.removeItem(CURRENT_USER_KEY);
};

export const getCurrentUser = (): User | null => {
  const user = localStorage.getItem(CURRENT_USER_KEY);
  return user ? JSON.parse(user) : null;
};
