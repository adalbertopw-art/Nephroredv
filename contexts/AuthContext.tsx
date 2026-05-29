import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  signOut: () => Promise<void>;
  isLoading: boolean;
  isAdmin: boolean;
  verificationStatus: "unverified" | "pending" | "verified";
  updateVerificationStatus: (
    status: "unverified" | "pending" | "verified",
    metadata?: any,
  ) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  signOut: async () => {},
  isLoading: true,
  isAdmin: false,
  verificationStatus: "unverified",
  updateVerificationStatus: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<
    "unverified" | "pending" | "verified"
  >("unverified");

  const fetchProfile = async (currentUser: User) => {
    if (!supabase) return;

    const isAdminUser =
      currentUser.email?.toLowerCase() === "adalberto.pw@gmail.com";
    setIsAdmin(isAdminUser);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching profile:", error);
        return;
      }

      if (data) {
        let currentStatus = data.verification_status;
        const meta = currentUser.user_metadata || {};
        
        if (isAdminUser && currentStatus !== "verified") {
          // Auto-verify admin
          await supabase
            .from("profiles")
            .update({ verification_status: "verified" })
            .eq("id", currentUser.id);
          currentStatus = "verified";
        } else if (!currentStatus || currentStatus === "unverified") {
          // If profile was auto-created by a DB trigger without a status, or stuck
          // make them pending so they appear in the Admin Panel
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ 
               verification_status: "pending",
               full_name: meta.full_name || data.full_name,
               license_number: meta.license_number || data.license_number,
               country: meta.country || data.country,
               email: currentUser.email || data.email
            })
            .eq("id", currentUser.id);
            
          if (updateError) {
             console.error("Error updating existing unverified profile:", updateError);
          } else {
             currentStatus = "pending";
          }
        }
        
        setVerificationStatus(currentStatus || "unverified");
      } else {
        // Create profile if it doesn't exist, using metadata from signup
        const meta = currentUser.user_metadata || {};
        const isAdminNew = isAdminUser;
        const newProfile = {
          id: currentUser.id,
          email: currentUser.email || "",
          verification_status: (isAdminNew
            ? "verified"
            : "pending") as "verified" | "pending" | "unverified",
          full_name: meta.full_name || "",
          license_number: meta.license_number || "",
          country: meta.country || "",
          quiz_passed: isAdminNew ? true : meta.quiz_passed || false
        };

        const { error: insertError } = await supabase.from("profiles").upsert(newProfile);
        let finalStatus = newProfile.verification_status;
        if (insertError) {
          console.error("Error inserting profile:", insertError);
          // Try without quiz_passed in case it doesn't exist
          const fallbackProfile = {
            id: currentUser.id,
            verification_status: newProfile.verification_status,
            full_name: newProfile.full_name,
            license_number: newProfile.license_number,
            country: newProfile.country
          };
          const { error: fallbackError } = await supabase.from("profiles").upsert(fallbackProfile);
          if (fallbackError) {
             console.error("Fallback insert error:", fallbackError);
             const minimalProfile = {
                id: currentUser.id,
                full_name: newProfile.full_name,
                verification_status: newProfile.verification_status
             };
             const { error: minimalError } = await supabase.from("profiles").upsert(minimalProfile);
             if (minimalError) {
                 console.error("Minimal fallback insert error:", minimalError);
             }
          }
        }
        setVerificationStatus(newProfile.verification_status);
      }
    } catch (err) {
      console.error("Unexpected error fetching profile:", err);
    }
  };

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser);
      } else {
        setVerificationStatus("unverified");
        setIsAdmin(false);
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser);
      } else {
        setVerificationStatus("unverified");
        setIsAdmin(false);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
  };

  const updateVerificationStatus = async (
    status: "unverified" | "pending" | "verified",
    metadata?: any,
  ) => {
    if (!supabase || !user) return;

    const isAdminUser = user.email?.toLowerCase() === "adalberto.pw@gmail.com";
    const finalStatus = isAdminUser ? "verified" : status;

    try {
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        verification_status: finalStatus,
        ...metadata,
      });

      if (error) throw error;
      setVerificationStatus(finalStatus);
    } catch (err) {
      console.error("Error updating verification status:", err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        signOut,
        isLoading,
        isAdmin,
        verificationStatus,
        updateVerificationStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
