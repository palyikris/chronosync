import { useContext } from "react";
import { AuthContext } from "./authContextBase";

export const useAuth = () => useContext(AuthContext);
