import { createContext } from "react";

export interface ThemeContextValue {
  theme: "dark" | "light";
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggleTheme: () => {},
});

export interface AuthContextValue {
  isLoggedIn: boolean;
  setLoggedIn: (value: boolean) => void;
}

export const AuthContext = createContext<AuthContextValue>({
  isLoggedIn: false,
  setLoggedIn: () => {},
});
