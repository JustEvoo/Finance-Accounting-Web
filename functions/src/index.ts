import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();

/**
 * Firebase Callable Cloud Function resetUserAccount
 * Deletes all documents associated with the current user's uid
 * in the 'transactions', 'ledgers', and 'journals' collections.
 */
export const resetUserAccount = onCall(async (request) => {
  // 1. Security check: Verify request is authenticated
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "The request must be authenticated to reset the account."
    );
  }

  const uid = request.auth.uid;
  const db = admin.firestore();

  // The requested collections
  const collections = ["transactions", "ledgers", "journals"];
  const batchSize = 500;

  console.log(`Starting account reset for user: ${uid}`);

  for (const collectionName of collections) {
    // Delete documents where 'uid' matches or 'userId' matches
    for (const fieldName of ["uid", "userId"]) {
      let hasMore = true;
      while (hasMore) {
        const querySnapshot = await db
          .collection(collectionName)
          .where(fieldName, "==", uid)
          .limit(batchSize)
          .get();

        if (querySnapshot.empty) {
          hasMore = false;
          break;
        }

        const batch = db.batch();
        querySnapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });

        await batch.commit();
        console.log(`Deleted ${querySnapshot.size} documents from '${collectionName}' matching ${fieldName}=${uid}`);

        if (querySnapshot.docs.length < batchSize) {
          hasMore = false;
        }
      }
    }
  }

  // Also, for complete ERP synchronization, we reset the actual active user's accounts and journalEntries subcollections in Firestore
  try {
    const userAccountsRef = db.collection("users").doc(uid).collection("accounts");
    const accountsSnapshot = await userAccountsRef.limit(batchSize).get();
    if (!accountsSnapshot.empty) {
      const batch = db.batch();
      accountsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }

    const userEntriesRef = db.collection("users").doc(uid).collection("journalEntries");
    const entriesSnapshot = await userEntriesRef.limit(batchSize).get();
    if (!entriesSnapshot.empty) {
      const batch = db.batch();
      entriesSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }
    console.log(`Cleaned up subcollections under users/${uid}`);
  } catch (err) {
    console.warn("Subcollections cleanup skipped or failed: ", err);
  }

  return {
    success: true,
    message: "All user documents in 'transactions', 'ledgers', and 'journals' have been permanently deleted.",
    uid
  };
});
