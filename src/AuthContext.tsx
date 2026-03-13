import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  skillHave: string;
  skillWant: string;
  contact: string;
  contactType: 'email' | 'whatsapp';
  location?: { lat: number; lng: number };
  coins: number;
  settings?: {
    emailNotifs?: boolean;
    pushNotifs?: boolean;
    publicProfile?: boolean;
    language?: string;
    twoFactor?: boolean;
    dataSaver?: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  updateProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let profileUnsubscribe: (() => void) | undefined;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      // Clean up previous listener if it exists
      if (profileUnsubscribe) {
        profileUnsubscribe();
        profileUnsubscribe = undefined;
      }

      if (firebaseUser) {
        try {
          const docRef = doc(db, 'users', firebaseUser.uid);
          
          profileUnsubscribe = onSnapshot(docRef, async (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as UserProfile;
              if (data.coins === undefined) {
                data.coins = 50;
                await setDoc(docRef, { coins: 50 }, { merge: true });
              }
              setProfile(data);
              setLoading(false);
            } else {
              const newProfile: UserProfile = {
                uid: firebaseUser.uid,
                name: firebaseUser.displayName || 'Anonymous',
                email: firebaseUser.email || '',
                photoURL: firebaseUser.photoURL || '',
                skillHave: '',
                skillWant: '',
                contact: firebaseUser.email || '',
                contactType: 'email',
                coins: 50,
              };
              await setDoc(docRef, newProfile);
              setProfile(newProfile);
              setLoading(false);
            }
          }, (error) => {
            console.error("Firestore snapshot error:", error);
            // Don't reset the profile on transient errors like network disconnects
            setLoading(false);
          });
        } catch (error) {
          console.error("Error setting up user profile listener:", error);
          setLoading(false);
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (profileUnsubscribe) profileUnsubscribe();
    };
  }, []);

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user || !profile) return;
    try {
      const cleanData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
      await setDoc(doc(db, 'users', user.uid), cleanData, { merge: true });
      // We don't need to manually setProfile here anymore because onSnapshot will handle it
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
