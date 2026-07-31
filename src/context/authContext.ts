import { createContext } from "react";
import { type AuthContextType } from "../types/auth";

export const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  loading: true,
  isSuperAdmin: false,
  isCompanyAdmin: false,
  signOut: async () => {},
});