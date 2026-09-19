import { onCall, CallableRequest, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

if (!admin.apps.length) {
  admin.initializeApp();
}

const DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || "ai-studio-vasterp-cef6668c-54cb-4066-a4e7-cc376decd3ac";

function getFirestoreInstance() {
  try {
    return getFirestore(DATABASE_ID);
  } catch {
    return admin.firestore();
  }
}

/**
 * These callables run with Admin SDK privileges, so they bypass
 * firestore.rules entirely. Every gate the rules enforce has to be re-asserted
 * here or the function becomes the way around the rules.
 *
 * Mirrors isVerifiedUser() in firestore.rules.
 */
function requireVerifiedUid(request: CallableRequest): string {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Authentication required."
    );
  }

  if (request.auth.token.email_verified !== true) {
    throw new HttpsError(
      "permission-denied",
      "A verified email address is required before writing ledger data."
    );
  }

  return request.auth.uid;
}

// Caps concurrent instances so a hostile or looping client cannot turn a
// callable into an unbounded billing event (denial of wallet).
const CALLABLE_OPTIONS = { maxInstances: 10 } as const;

interface IncomingJournalLine {
  id?: unknown;
  accountCode?: unknown;
  debit?: unknown;
  credit?: unknown;
}

interface SanitizedJournalLine {
  id: string;
  accountCode: string;
  debit: number;
  credit: number;
}

interface SanitizedJournalEntry {
  id: string;
  date: string;
  reference: string;
  description: string;
  lines: SanitizedJournalLine[];
}

export const postJournalEntry = onCall(CALLABLE_OPTIONS, async (request) => {
  const uid = requireVerifiedUid(request);
  const entryData = request.data?.entryData;

  if (!entryData || typeof entryData !== "object" || Array.isArray(entryData)) {
    throw new HttpsError(
      "invalid-argument",
      "Payload must include a valid 'entryData' object."
    );
  }

  const { id, date, reference, description, lines } = entryData;

  if (typeof id !== "string" || !id.trim() || id.length > 128 || !/^[a-zA-Z0-9_\-]+$/.test(id)) {
    throw new HttpsError(
      "invalid-argument",
      "Invalid 'id': must be an alphanumeric string up to 128 characters."
    );
  }

  if (typeof date !== "string" || date.length !== 10 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new HttpsError(
      "invalid-argument",
      "Invalid 'date': must follow ISO YYYY-MM-DD format (10 characters)."
    );
  }

  if (typeof reference !== "string" || reference.length > 50) {
    throw new HttpsError(
      "invalid-argument",
      "Invalid 'reference': must be a string not exceeding 50 characters."
    );
  }

  if (typeof description !== "string" || description.length > 500) {
    throw new HttpsError(
      "invalid-argument",
      "Invalid 'description': must be a string not exceeding 500 characters."
    );
  }

  if (!Array.isArray(lines) || lines.length < 2) {
    throw new HttpsError(
      "invalid-argument",
      "Double-entry bookkeeping requires at least 2 journal lines."
    );
  }

  if (lines.length > 100) {
    throw new HttpsError(
      "invalid-argument",
      "Journal entry cannot exceed 100 transaction lines."
    );
  }

  let totalDebits = 0;
  let totalCredits = 0;
  const sanitizedLines: SanitizedJournalLine[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i] as IncomingJournalLine;

    if (!rawLine || typeof rawLine !== "object") {
      throw new HttpsError(
        "invalid-argument",
        `Line ${i + 1} is not a valid transaction object.`
      );
    }

    const lineId = typeof rawLine.id === "string" && rawLine.id.trim() && rawLine.id.length <= 128
      ? rawLine.id.trim()
      : `L-${Date.now()}-${i}`;

    if (typeof rawLine.accountCode !== "string" || !rawLine.accountCode.trim() || rawLine.accountCode.length > 32) {
      throw new HttpsError(
        "invalid-argument",
        `Line ${i + 1} contains an invalid 'accountCode'. Must be a string up to 32 characters.`
      );
    }

    const debit = typeof rawLine.debit === "number" ? rawLine.debit : Number(rawLine.debit || 0);
    const credit = typeof rawLine.credit === "number" ? rawLine.credit : Number(rawLine.credit || 0);

    if (!isFinite(debit) || isNaN(debit) || debit < 0 || !isFinite(credit) || isNaN(credit) || credit < 0) {
      throw new HttpsError(
        "invalid-argument",
        `Line ${i + 1} debit and credit values must be non-negative finite numbers.`
      );
    }

    if (debit === 0 && credit === 0) {
      throw new HttpsError(
        "invalid-argument",
        `Line ${i + 1} cannot have both debit and credit equal to zero.`
      );
    }

    if (debit > 0 && credit > 0) {
      throw new HttpsError(
        "invalid-argument",
        `Line ${i + 1} cannot have both debit and credit greater than zero.`
      );
    }

    totalDebits += debit;
    totalCredits += credit;

    sanitizedLines.push({
      id: lineId,
      accountCode: rawLine.accountCode.trim(),
      debit,
      credit
    });
  }

  const discrepancy = Math.abs(totalDebits - totalCredits);
  if (discrepancy > 0.0001 || totalDebits <= 0) {
    throw new HttpsError(
      "invalid-argument",
      `Ledger payload is unbalanced: Total Debits (${totalDebits}) does not equal Total Credits (${totalCredits}). Discrepancy: ${discrepancy}.`
    );
  }

  const sanitizedEntry: SanitizedJournalEntry = {
    id,
    date,
    reference: reference.trim(),
    description: description.trim(),
    lines: sanitizedLines
  };

  const db = getFirestoreInstance();
  const entryRef = db
    .collection("users")
    .doc(uid)
    .collection("journalEntries")
    .doc(id);

  // `create()` rejects if the document already exists. `set()` silently
  // overwrote it, which let a caller replay an existing entry ID and rewrite
  // posted history - a direct violation of the immutability invariant.
  try {
    await entryRef.create(sanitizedEntry);
  } catch (err) {
    const code = (err as { code?: number | string })?.code;
    if (code === 6 || code === "already-exists") {
      throw new HttpsError(
        "already-exists",
        `Journal entry '${id}' has already been posted. Posted entries are immutable; void it and post a correcting entry instead.`
      );
    }
    throw err;
  }

  return {
    success: true,
    entryId: id,
    message: "Journal entry successfully validated, balanced, and posted."
  };
});

export const resetUserAccount = onCall(CALLABLE_OPTIONS, async (request) => {
  const uid = requireVerifiedUid(request);
  const db = getFirestoreInstance();
  const batchSize = 500;

  const collections = ["transactions", "ledgers", "journals"];
  for (const collectionName of collections) {
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

        if (querySnapshot.docs.length < batchSize) {
          hasMore = false;
        }
      }
    }
  }

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
  } catch (err) {
    console.warn("Subcollections cleanup skipped or failed: ", err);
  }

  return {
    success: true,
    message: "All user documents in 'transactions', 'ledgers', and 'journals' have been permanently deleted.",
    uid
  };
});
