
"use client";

import type { User as FirebaseUser } from "firebase/auth";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { auth, db, googleAuthProvider } from "@/lib/firebase"; // Added googleAuthProvider
import { 
  onAuthStateChanged, 
  signInWithPopup, // Added signInWithPopup
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  updatePassword as firebaseUpdatePassword, 
  deleteUser as firebaseDeleteUser, 
  EmailAuthProvider, 
  reauthenticateWithCredential
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

const GUEST_USER_ID = "GUEST_USER_ID";
const GUEST_MODE_FLAG = "r3za_guest_mode";

interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null; 
  isPremium: boolean;
}

interface UpdateProfileData {
  displayName?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isGuest: boolean;
  isPremium: boolean; 
  signInWithGoogle: () => Promise<void>; // Added
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateCurrentUserProfile: (profileData: UpdateProfileData) => Promise<void>; 
  updateUserPassword: (newPassword: string) => Promise<void>; 
  deleteCurrentUserAccount: () => Promise<void>; 
  reauthenticateUser: (password: string) => Promise<void>; 
  enterGuestMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [isPremium, setIsPremium] = useState(false); 
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const guestFlag = localStorage.getItem(GUEST_MODE_FLAG);
    if (guestFlag === 'true') {
      setIsGuest(true);
      setUser({
        uid: GUEST_USER_ID,
        email: "guest@example.com",
        displayName: "Guest User",
        photoURL: null, 
        isPremium: true, 
      });
      setIsPremium(true);
      setLoading(false);
    } else {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
          setIsGuest(false);
          localStorage.removeItem(GUEST_MODE_FLAG); 
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL, 
            isPremium: true, 
          });
          setIsPremium(true); 
        } else {
          if (!localStorage.getItem(GUEST_MODE_FLAG)) {
            setUser(null);
            setIsPremium(false);
            setIsGuest(false);
          }
        }
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, []);

  const enterGuestMode = () => {
    localStorage.setItem(GUEST_MODE_FLAG, 'true');
    setIsGuest(true);
    setUser({
      uid: GUEST_USER_ID,
      email: "guest@example.com",
      displayName: "Guest User",
      photoURL: null,
      isPremium: true,
    });
    setIsPremium(true);
    setLoading(false);
    router.push("/dashboard");
    toast({ title: "Guest Mode Activated", description: "Your data will be stored locally in this browser." });
  };

  const clearGuestData = () => {
    localStorage.removeItem('r3za_guest_transactions');
    localStorage.removeItem('r3za_guest_budgets');
    localStorage.removeItem(`r3za-notifications-guest`);
    localStorage.removeItem(GUEST_MODE_FLAG);
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    clearGuestData();
    setIsGuest(false);
    try {
      await signInWithPopup(auth, googleAuthProvider);
      toast({ title: "Signed in with Google successfully!" });
      // User state will be updated by onAuthStateChanged, which triggers redirect
    } catch (error: any) {
      console.error("Error signing in with Google: ", error);
      toast({ title: "Google Sign-in failed", description: error.message || "Could not sign in with Google.", variant: "destructive" });
      setLoading(false); // Ensure loading is false on error
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    setLoading(true);
    clearGuestData();
    setIsGuest(false);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "Signed in successfully!" });
    } catch (error: any) {
      console.error("Error signing in with email: ", error);
      let description = "An unexpected error occurred.";
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        description = "Invalid email or password. Please try again.";
      } else if (error.message) {
        description = error.message;
      }
      toast({ title: "Sign in failed", description, variant: "destructive" });
      setLoading(false); 
    }
  };
  
  const signUpWithEmail = async (email: string, password: string, displayName?: string) => {
    setLoading(true);
    clearGuestData();
    setIsGuest(false);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        await updateProfile(userCredential.user, { 
          displayName: displayName || email.split('@')[0],
          photoURL: null 
        });
      }
      toast({ title: "Account created successfully!" });
    } catch (error: any)
      {
      console.error("Error signing up with email: ", error);
      let description = "An unexpected error occurred during sign up.";
      if (error.code === 'auth/email-already-in-use') {
        description = "This email is already registered. Please try logging in.";
      } else if (error.code === 'auth/weak-password') {
        description = "The password is too weak. Please choose a stronger password.";
      } else if (error.message) {
        description = error.message;
      }
      toast({ title: "Sign up failed", description, variant: "destructive" });
      setLoading(false);
    }
  };

  const updateCurrentUserProfile = async (profileData: UpdateProfileData) => {
    if (isGuest) {
        toast({title: "Guest Mode", description: "Profile cannot be updated in guest mode. Please sign up.", variant: "default"});
        return;
    }
    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast({ title: "Not authenticated", description: "No user logged in to update.", variant: "destructive" });
      return;
    }
    
    setLoading(true);
    let changesMade = false;
    const authProfileUpdate: { displayName?: string | null; photoURL?: string | null } = {};

    if (profileData.displayName !== undefined && profileData.displayName !== currentUser.displayName) {
      authProfileUpdate.displayName = profileData.displayName;
      changesMade = true;
    }
    
    if (!changesMade) { 
      toast({ title: "No Changes", description: "Your profile information is already up to date." });
      setLoading(false);
      return;
    }
    
    try {
      await updateProfile(currentUser, authProfileUpdate);

      setUser(prevUser => {
        if (!prevUser) return null; 
        const updatedUser = { ...prevUser };
        if (authProfileUpdate.displayName !== undefined) {
          updatedUser.displayName = authProfileUpdate.displayName;
        }
        return updatedUser;
      });
      toast({ title: "Profile Updated", description: "Your profile has been successfully updated." });
    } catch (error: any) {
      console.error("Error updating profile: ", error);
      toast({ title: "Profile update failed", description: error.message, variant: "destructive" });
      throw error; 
    } finally {
      setLoading(false);
    }
  };

  const updateUserPassword = async (newPassword: string) => {
    if (isGuest || !auth.currentUser) {
        toast({title: "Action Not Allowed", description: "Password cannot be changed in guest mode or if not logged in.", variant: "default"});
        throw new Error("User not authenticated or in guest mode.");
    }
    setLoading(true);
    try {
      await firebaseUpdatePassword(auth.currentUser, newPassword);
      toast({ title: "Password Updated", description: "Your password has been changed successfully." });
    } catch (error: any) {
      console.error("Error updating password:", error);
      if (error.code === 'auth/requires-recent-login') {
        toast({ title: "Re-authentication Required", description: "For security, please sign out and sign back in, then try changing your password again.", variant: "destructive" });
      } else if (error.code === 'auth/weak-password') {
        toast({ title: "Weak Password", description: "The password is too weak. Please choose a stronger one.", variant: "destructive" });
      } else {
        toast({ title: "Password Update Failed", description: error.message || "Could not update password.", variant: "destructive" });
      }
      throw error; 
    } finally {
      setLoading(false);
    }
  };

  const deleteCurrentUserAccount = async () => {
    if (isGuest || !auth.currentUser) {
        toast({title: "Action Not Allowed", description: "Account cannot be deleted in guest mode or if not logged in.", variant: "default"});
        throw new Error("User not authenticated or in guest mode.");
    }
    setLoading(true);
    try {
      await firebaseDeleteUser(auth.currentUser);
      toast({ title: "Account Deleted", description: "Your account has been permanently deleted." });
    } catch (error: any) {
       if (error.code === 'auth/requires-recent-login') {
        toast({ title: "Re-authentication Required", description: "For security, please sign out and sign back in, then try deleting your account again.", variant: "destructive" });
      } else {
        toast({ title: "Account Deletion Failed", description: error.message || "Could not delete account.", variant: "destructive" });
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const reauthenticateUser = async (password: string) => {
    if (isGuest) {
        toast({title: "Action Not Allowed", description: "Re-authentication not applicable for guest mode.", variant: "default"});
        throw new Error("Guest mode does not support re-authentication.");
    }
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) {
      throw new Error("User not found or email missing for re-authentication.");
    }
    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, password);
      await reauthenticateWithCredential(currentUser, credential);
      toast({title: "Re-authenticated", description: "You can now proceed with the sensitive action."});
    } catch (error: any) {
      console.error("Re-authentication failed:", error);
      toast({title: "Re-authentication Failed", description: error.message || "Could not re-authenticate.", variant: "destructive"});
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (isGuest) {
      clearGuestData();
      setIsGuest(false);
      setUser(null);
      setIsPremium(false);
      setLoading(false); 
      router.push("/"); 
      toast({ title: "Exited Guest Mode" });
    } else {
      try {
        await firebaseSignOut(auth);
        router.push("/"); 
        toast({ title: "Signed out successfully." });
      } catch (error: any) {
        console.error("Error signing out: ", error);
        toast({ title: "Sign out failed", description: error.message, variant: "destructive" });
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isGuest, isPremium, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut, updateCurrentUserProfile, updateUserPassword, deleteCurrentUserAccount, reauthenticateUser, enterGuestMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
