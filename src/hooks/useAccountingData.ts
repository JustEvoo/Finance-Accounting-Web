import { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  onSnapshot, 
  writeBatch,
  query,
  orderBy,
  getDocs,
  deleteDoc
} from 'firebase/firestore';
import { Account, JournalEntry } from '../types';
import { initialAccounts, initialJournalEntries } from '../initialData';
import { auth, db, functions, handleFirestoreError, OperationType, signInWithGoogle, handleSignOut } from '../firebase';
import { httpsCallable } from 'firebase/functions';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  createdAt: string;
  lastLoginAt: string;
  bio: string;
  theme: string;
  language: string;
}

export function useAccountingData() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCloud, setIsCloud] = useState(false);

  // Authentication & Session management
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      if (currentUser) {
        setUser(currentUser);
        setIsCloud(true);
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDocSnap = await getDoc(userDocRef).catch(err => {
            handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}`);
            throw err;
          });

          const nowIso = new Date().toISOString();
          let userProfileData: UserProfile;

          if (!userDocSnap.exists()) {
            // First time login - Create Firestore profile
            userProfileData = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || 'Vast ERP User',
              photoURL: currentUser.photoURL || '',
              createdAt: nowIso,
              lastLoginAt: nowIso,
              bio: '',
              theme: 'light',
              language: 'id'
            };

            // Write User Profile with exact 9 required keys
            await setDoc(userDocRef, userProfileData).catch(err => {
              handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}`);
            });

          } else {
            // Existing user - Update last login timestamp preserving createdAt, bio, theme, language
            const existingData = userDocSnap.data() as UserProfile;
            userProfileData = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || existingData.displayName || 'Vast ERP User',
              photoURL: currentUser.photoURL || existingData.photoURL || '',
              createdAt: existingData.createdAt || nowIso,
              lastLoginAt: nowIso,
              bio: existingData.bio ?? '',
              theme: existingData.theme ?? 'light',
              language: existingData.language ?? 'id'
            };

            await setDoc(userDocRef, userProfileData).catch(err => {
              handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
            });
          }

          setProfile(userProfileData);

        } catch (error) {
          console.error("Failed to sync user session in Firestore:", error);
        }
      } else {
        // No Google authenticated user
        setUser(null);
        setIsCloud(false);
        
        const guestBio = localStorage.getItem('vast_erp_guest_bio') || 'Akun Demo Offline (Guest Mode). Hubungkan ke Google Cloud untuk sinkronisasi otomatis.';
        const guestTheme = localStorage.getItem('vast_erp_guest_theme') || 'light';
        const guestLanguage = localStorage.getItem('vast_erp_guest_language') || 'id';
        setProfile({
          uid: 'guest',
          email: 'guest@vast-erp.local',
          displayName: 'Tamu Vast ERP',
          photoURL: '',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          bio: guestBio,
          theme: guestTheme,
          language: guestLanguage
        });

        // Fallback to local storage for guest session
        const storedAccounts = localStorage.getItem('indoledger_accounts');
        const storedEntries = localStorage.getItem('indoledger_journal_entries');

        if (storedAccounts && storedEntries) {
          try {
            setAccounts(JSON.parse(storedAccounts));
            setEntries(JSON.parse(storedEntries));
          } catch (err) {
            setAccounts(initialAccounts);
            setEntries(initialJournalEntries);
          }
        } else {
          setAccounts(initialAccounts);
          setEntries(initialJournalEntries);
          localStorage.setItem('indoledger_accounts', JSON.stringify(initialAccounts));
          localStorage.setItem('indoledger_journal_entries', JSON.stringify(initialJournalEntries));
        }
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Real-time Firestore Subscriptions for authenticated cloud session
  useEffect(() => {
    if (!user) return;

    const accountsPath = `users/${user.uid}/accounts`;
    const entriesPath = `users/${user.uid}/journalEntries`;

    setLoading(true);

    // Subscribe to accounts
    const unsubscribeAccounts = onSnapshot(
      collection(db, 'users', user.uid, 'accounts'),
      (snapshot) => {
        const accList: Account[] = [];
        snapshot.forEach((doc) => {
          accList.push(doc.data() as Account);
        });
        // Sort accounts by code for consistency
        accList.sort((a, b) => a.code.localeCompare(b.code));
        setAccounts(accList);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, accountsPath);
      }
    );

    // Subscribe to journal entries
    const unsubscribeEntries = onSnapshot(
      collection(db, 'users', user.uid, 'journalEntries'),
      (snapshot) => {
        const entryList: JournalEntry[] = [];
        snapshot.forEach((doc) => {
          entryList.push(doc.data() as JournalEntry);
        });
        // Sort entries by date desc, then by id/reference desc
        entryList.sort((a, b) => {
          const dateDiff = b.date.localeCompare(a.date);
          if (dateDiff !== 0) return dateDiff;
          return b.id.localeCompare(a.id);
        });
        setEntries(entryList);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, entriesPath);
      }
    );

    return () => {
      unsubscribeAccounts();
      unsubscribeEntries();
    };
  }, [user]);

  // Actions
  const addEntry = async (newEntry: JournalEntry) => {
    if (user) {
      const path = `users/${user.uid}/journalEntries/${newEntry.id}`;
      await setDoc(doc(db, 'users', user.uid, 'journalEntries', newEntry.id), newEntry)
        .catch(err => {
          handleFirestoreError(err, OperationType.CREATE, path);
          throw err;
        });
    } else {
      const updated = [newEntry, ...entries];
      setEntries(updated);
      localStorage.setItem('indoledger_journal_entries', JSON.stringify(updated));
    }
  };

  const deleteEntry = async (entryId: string) => {
    if (user) {
      const path = `users/${user.uid}/journalEntries/${entryId}`;
      await deleteDoc(doc(db, 'users', user.uid, 'journalEntries', entryId))
        .catch(err => {
          handleFirestoreError(err, OperationType.DELETE, path);
          throw err;
        });
    } else {
      const updated = entries.filter(e => e.id !== entryId);
      setEntries(updated);
      localStorage.setItem('indoledger_journal_entries', JSON.stringify(updated));
    }
  };

  const addAccount = async (newAccount: Account) => {
    if (user) {
      const path = `users/${user.uid}/accounts/${newAccount.code}`;
      await setDoc(doc(db, 'users', user.uid, 'accounts', newAccount.code), newAccount)
        .catch(err => {
          handleFirestoreError(err, OperationType.CREATE, path);
          throw err;
        });
    } else {
      const updated = [...accounts, newAccount];
      updated.sort((a, b) => a.code.localeCompare(b.code));
      setAccounts(updated);
      localStorage.setItem('indoledger_accounts', JSON.stringify(updated));
    }
  };

  const deleteAccount = async (accountCode: string) => {
    if (user) {
      const path = `users/${user.uid}/accounts/${accountCode}`;
      await deleteDoc(doc(db, 'users', user.uid, 'accounts', accountCode))
        .catch(err => {
          handleFirestoreError(err, OperationType.DELETE, path);
          throw err;
        });
    } else {
      const updated = accounts.filter(a => a.code !== accountCode);
      setAccounts(updated);
      localStorage.setItem('indoledger_accounts', JSON.stringify(updated));
    }
  };

  const updateAccount = async (accountCode: string, updatedAccount: Account) => {
    if (user) {
      const isCodeChanged = accountCode !== updatedAccount.code;
      const batch = writeBatch(db);
      if (isCodeChanged) {
        batch.delete(doc(db, 'users', user.uid, 'accounts', accountCode));
      }
      batch.set(doc(db, 'users', user.uid, 'accounts', updatedAccount.code), updatedAccount);
      await batch.commit().catch(err => {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/accounts/${updatedAccount.code}`);
        throw err;
      });
    } else {
      let updated = accounts.map(a => a.code === accountCode ? updatedAccount : a);
      if (accountCode !== updatedAccount.code) {
        const exists = accounts.some(a => a.code === updatedAccount.code);
        if (exists) {
          throw new Error("New account code already exists");
        }
        updated = accounts.map(a => a.code === accountCode ? updatedAccount : a);
      }
      updated.sort((a, b) => a.code.localeCompare(b.code));
      setAccounts(updated);
      localStorage.setItem('indoledger_accounts', JSON.stringify(updated));
    }
  };

  const resetData = async (options?: { clearAllToZero?: boolean }) => {
    const clearAllToZero = options?.clearAllToZero ?? false;
    
    if (user) {
      setLoading(true);
      try {
        const batch = writeBatch(db);

        // Delete existing custom accounts & entries
        // Note: Batch deletion in subcollections
        accounts.forEach(acc => {
          batch.delete(doc(db, 'users', user.uid, 'accounts', acc.code));
        });
        entries.forEach(entry => {
          batch.delete(doc(db, 'users', user.uid, 'journalEntries', entry.id));
        });

        // Set new accounts
        initialAccounts.forEach(acc => {
          const accData = {
            ...acc,
            initialBalance: clearAllToZero ? 0 : acc.initialBalance
          };
          batch.set(doc(db, 'users', user.uid, 'accounts', acc.code), accData);
        });

        // Only set seeded entries if not resetting to zero
        if (!clearAllToZero) {
          initialJournalEntries.forEach(entry => {
            batch.set(doc(db, 'users', user.uid, 'journalEntries', entry.id), entry);
          });
        }

        await batch.commit().catch(err => {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/[reset]`);
        });
      } catch (error) {
        console.error("Reset data on Firestore failed:", error);
      } finally {
        setLoading(false);
      }
    } else {
      if (clearAllToZero) {
        const zeroedAccounts = initialAccounts.map(acc => ({
          ...acc,
          initialBalance: 0
        }));
        setAccounts(zeroedAccounts);
        setEntries([]);
        localStorage.setItem('indoledger_accounts', JSON.stringify(zeroedAccounts));
        localStorage.setItem('indoledger_journal_entries', JSON.stringify([]));
      } else {
        setAccounts(initialAccounts);
        setEntries(initialJournalEntries);
        localStorage.setItem('indoledger_accounts', JSON.stringify(initialAccounts));
        localStorage.setItem('indoledger_journal_entries', JSON.stringify(initialJournalEntries));
      }
    }
  };

  const login = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Login trigger failed:", error);
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await handleSignOut();
    } catch (error) {
      console.error("Logout trigger failed:", error);
      setLoading(false);
    }
  };

  const updateBio = async (newBio: string) => {
    if (user && profile) {
      const updatedProfile = { 
        ...profile, 
        bio: newBio, 
        lastLoginAt: new Date().toISOString() 
      };
      const path = `users/${user.uid}`;
      await setDoc(doc(db, 'users', user.uid), updatedProfile)
        .then(() => {
          setProfile(updatedProfile);
        })
        .catch(err => {
          handleFirestoreError(err, OperationType.UPDATE, path);
          throw err;
        });
    } else {
      // Offline/Guest local fallback
      const updatedProfile = profile ? { ...profile, bio: newBio } : {
        uid: 'guest',
        email: 'guest@vast-erp.local',
        displayName: 'Tamu Vast ERP',
        photoURL: '',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        bio: newBio,
        theme: localStorage.getItem('vast_erp_guest_theme') || 'light',
        language: localStorage.getItem('vast_erp_guest_language') || 'id'
      };
      setProfile(updatedProfile);
      localStorage.setItem('vast_erp_guest_bio', newBio);
    }
  };

  const updateSettings = async (theme: string, language: string) => {
    if (user && profile) {
      const updatedProfile = { 
        ...profile, 
        theme,
        language,
        lastLoginAt: new Date().toISOString() 
      };
      const path = `users/${user.uid}`;
      await setDoc(doc(db, 'users', user.uid), updatedProfile)
        .then(() => {
          setProfile(updatedProfile);
        })
        .catch(err => {
          handleFirestoreError(err, OperationType.UPDATE, path);
          throw err;
        });
    } else {
      // Offline/Guest local fallback
      const updatedProfile = profile ? { ...profile, theme, language } : {
        uid: 'guest',
        email: 'guest@vast-erp.local',
        displayName: 'Tamu Vast ERP',
        photoURL: '',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        bio: localStorage.getItem('vast_erp_guest_bio') || '',
        theme,
        language
      };
      setProfile(updatedProfile);
      localStorage.setItem('vast_erp_guest_theme', theme);
      localStorage.setItem('vast_erp_guest_language', language);
    }
  };

  const resetCloudAccount = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch all existing journal entries and accounts directly from Firestore to ensure clean deletion
      const entriesSnap = await getDocs(collection(db, 'users', user.uid, 'journalEntries')).catch(err => {
        handleFirestoreError(err, OperationType.GET, `users/${user.uid}/journalEntries`);
        throw err;
      });
      const accountsSnap = await getDocs(collection(db, 'users', user.uid, 'accounts')).catch(err => {
        handleFirestoreError(err, OperationType.GET, `users/${user.uid}/accounts`);
        throw err;
      });

      const batch = writeBatch(db);

      // 2. Queue all existing journal entries for deletion
      entriesSnap.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });

      // 3. Queue all existing accounts for deletion (to clean any custom added accounts)
      accountsSnap.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });

      // 4. Seed the default accounts back with an initial balance of 0
      initialAccounts.forEach(acc => {
        const accData = {
          ...acc,
          initialBalance: 0
        };
        batch.set(doc(db, 'users', user.uid, 'accounts', acc.code), accData);
      });

      // 5. Commit batch write to Firestore
      await batch.commit().catch(err => {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/reset-cloud`);
        throw err;
      });

      console.log("Cloud account data successfully reset to zero. User profile and session preserved.");
    } catch (error) {
      console.error("Reset cloud account failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    profile,
    accounts,
    entries,
    loading,
    isCloud,
    addEntry,
    deleteEntry,
    addAccount,
    deleteAccount,
    updateAccount,
    resetData,
    login,
    logout,
    updateBio,
    updateSettings,
    resetCloudAccount
  };
}
