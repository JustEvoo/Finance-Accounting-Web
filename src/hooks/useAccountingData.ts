import { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  onSnapshot, 
  writeBatch,
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

            await setDoc(userDocRef, userProfileData).catch(err => {
              handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}`);
            });
          } else {
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

        const storedAccounts = localStorage.getItem('indoledger_accounts');
        const storedEntries = localStorage.getItem('indoledger_journal_entries');

        if (storedAccounts && storedEntries) {
          try {
            setAccounts(JSON.parse(storedAccounts));
            setEntries(JSON.parse(storedEntries));
          } catch {
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

  useEffect(() => {
    if (!user) return;

    const accountsPath = `users/${user.uid}/accounts`;
    const entriesPath = `users/${user.uid}/journalEntries`;

    setLoading(true);

    const unsubscribeAccounts = onSnapshot(
      collection(db, 'users', user.uid, 'accounts'),
      (snapshot) => {
        const accList: Account[] = [];
        snapshot.forEach((doc) => {
          accList.push(doc.data() as Account);
        });
        accList.sort((a, b) => a.code.localeCompare(b.code));
        setAccounts(accList);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, accountsPath);
      }
    );

    const unsubscribeEntries = onSnapshot(
      collection(db, 'users', user.uid, 'journalEntries'),
      (snapshot) => {
        const entryList: JournalEntry[] = [];
        snapshot.forEach((doc) => {
          entryList.push(doc.data() as JournalEntry);
        });
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

  const addEntry = async (newEntry: JournalEntry) => {
    if (user) {
      setLoading(true);
      try {
        const postJournalEntryFn = httpsCallable<
          { entryData: JournalEntry }, 
          { success: boolean; entryId: string; message: string }
        >(functions, 'postJournalEntry');
        
        const response = await postJournalEntryFn({ entryData: newEntry });
        return response.data;
      } catch (err: any) {
        console.error('Server rejected journal entry payload:', {
          code: err?.code || 'unknown',
          message: err?.message || 'Transaction rejected',
          details: err?.details || null,
          payload: newEntry
        });
        throw err;
      } finally {
        setLoading(false);
      }
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
        const resetCloudFn = httpsCallable(functions, 'resetUserAccount');
        await resetCloudFn().catch(err => {
          console.warn("Cloud function reset warning:", err);
        });

        const batch = writeBatch(db);
        initialAccounts.forEach(acc => {
          const accData = {
            ...acc,
            initialBalance: clearAllToZero ? 0 : acc.initialBalance
          };
          batch.set(doc(db, 'users', user.uid, 'accounts', acc.code), accData);
        });

        await batch.commit().catch(err => {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/[reset]`);
        });

        if (!clearAllToZero) {
          for (const entry of initialJournalEntries) {
            try {
              const postJournalEntryFn = httpsCallable<
                { entryData: JournalEntry }, 
                { success: boolean; entryId: string; message: string }
              >(functions, 'postJournalEntry');
              await postJournalEntryFn({ entryData: entry });
            } catch (err) {
              console.warn("Failed seeding initial entry through function:", err);
            }
          }
        }
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
      const resetCloudFn = httpsCallable(functions, 'resetUserAccount');
      await resetCloudFn().catch(err => {
        console.warn("Cloud function reset warning:", err);
      });

      const batch = writeBatch(db);
      initialAccounts.forEach(acc => {
        const accData = {
          ...acc,
          initialBalance: 0
        };
        batch.set(doc(db, 'users', user.uid, 'accounts', acc.code), accData);
      });

      await batch.commit().catch(err => {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/reset-cloud`);
        throw err;
      });
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
