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
    let profileUnsubscribe: () => void;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const docRef = doc(db, 'users', firebaseUser.uid);
          
          profileUnsubscribe = onSnapshot(docRef, async (docSnap) => {
            if (docSnap.exists()) {
              setProfile(docSnap.data() as UserProfile);
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
          });
        } catch (error) {
          console.error("Error fetching/creating user profile:", error);
          setProfile({
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || 'Anonymous',
            email: firebaseUser.email || '',
            skillHave: '',
            skillWant: '',
            contact: firebaseUser.email || '',
            contactType: 'email',
            coins: 50,
          });
          setLoading(false);
        }
      } else {
        setProfile(null);
        setLoading(false);
        if (profileUnsubscribe) profileUnsubscribe();
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
      const updatedProfile = { ...profile, ...cleanData };
      await setDoc(doc(db, 'users', user.uid), updatedProfile, { merge: true });
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
