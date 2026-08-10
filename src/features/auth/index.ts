export {
  authClient,
} from "./authClient";

export {
  AuthSheet,
} from "./components/AuthSheet";

export {
  useAuth,
} from "./hooks/useAuth";

export {
  getCurrentSession,
  signInWithEmail,
  signOut,
  signUpWithEmail,
} from "./repository/authRepository";

export type {
  AuthResult,
  AuthSession,
  AuthState,
  AuthUser,
} from "./types";