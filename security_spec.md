# Security Specification for Vast ERP

## 1. Data Invariants
- **Identity Isolation**: A user can only access (get, list, create, update, delete) their own user document, accounts collection, and journalEntries collection. Accessing another user's resources is strictly denied.
- **Verification Requirement**: Users must have a verified email (`request.auth.token.email_verified == true`) to write any data to Firestore.
- **ID Integrity**: Document IDs must be valid strings (`isValidId()`), with a size limit of 128 characters, matching the alphanumeric/dash regex: `^[a-zA-Z0-9_\-]+$`.
- **String Size Enforcement**: All text inputs must be size-constrained to prevent Denial of Wallet storage attacks. E.g., user displayName <= 100 chars, account name <= 100 chars, journal entry description <= 500 chars.
- **Immutability**: Once created, historical transaction IDs and timestamps must not be alterable.

---

## 2. The "Dirty Dozen" Payloads (Deny-by-Default Validation)

The following 12 malicious payloads attempt to violate security invariants and must return `PERMISSION_DENIED`.

### Payload 1: Spoofed Profile Creation (Identity Violation)
- **Path**: `/users/legit-user-id`
- **User context**: Authenticated as `attacker-id`
- **Attempt**: Write a profile under `legit-user-id` owned by the attacker.
```json
{
  "uid": "attacker-id",
  "email": "attacker@gmail.com",
  "displayName": "Attacker"
}
```

### Payload 2: Profile Escalation / Shadow Fields (Integrity Violation)
- **Path**: `/users/attacker-id`
- **User context**: Authenticated as `attacker-id`
- **Attempt**: Add unapproved custom administrative fields.
```json
{
  "uid": "attacker-id",
  "email": "attacker@gmail.com",
  "displayName": "Attacker",
  "isAdmin": true,
  "role": "owner"
}
```

### Payload 3: Unverified Email Write (Auth Gate Bypass)
- **Path**: `/users/attacker-id`
- **User context**: Authenticated as `attacker-id` with `email_verified == false`
- **Attempt**: Complete profile setup without verifying email address.
```json
{
  "uid": "attacker-id",
  "email": "attacker@gmail.com",
  "displayName": "Attacker"
}
```

### Payload 4: Resource Poisoning via Huge Name (Denial of Wallet)
- **Path**: `/users/attacker-id`
- **User context**: Authenticated as `attacker-id`
- **Attempt**: Inject a massive string to inflate Firestore storage usage.
```json
{
  "uid": "attacker-id",
  "email": "attacker@gmail.com",
  "displayName": "A".repeat(10000)
}
```

### Payload 5: Rogue Account Injection (Isolation Violation)
- **Path**: `/users/victim-id/accounts/1-1000`
- **User context**: Authenticated as `attacker-id`
- **Attempt**: Create an account record inside the victim's subcollection.
```json
{
  "code": "1-1000",
  "name": "Poisoned Cash",
  "type": "asset",
  "normalBalance": "debit",
  "initialBalance": 9999999
}
```

### Payload 6: Invalid Account Schema (Type Poisoning)
- **Path**: `/users/attacker-id/accounts/1-1000`
- **User context**: Authenticated as `attacker-id`
- **Attempt**: Submit an account where `initialBalance` is a string instead of a number.
```json
{
  "code": "1-1000",
  "name": "Cash",
  "type": "asset",
  "normalBalance": "debit",
  "initialBalance": "One Million"
}
```

### Payload 7: Account ID Poisoning (Junk Character Injection)
- **Path**: `/users/attacker-id/accounts/invalid-$$$-code`
- **User context**: Authenticated as `attacker-id`
- **Attempt**: Write an account with an invalid ID structure.
```json
{
  "code": "invalid-$$$-code",
  "name": "Bad ID Cash",
  "type": "asset",
  "normalBalance": "debit",
  "initialBalance": 1000
}
```

### Payload 8: Transaction Snooping (Confidentiality Violation)
- **Path**: `/users/victim-id/journalEntries/JV-2026-001`
- **User context**: Authenticated as `attacker-id`
- **Attempt**: Read journal entries belonging to a victim.
- **Action**: `GET` / `LIST`

### Payload 9: Hijacked Transaction Update (Immutability Violation)
- **Path**: `/users/victim-id/journalEntries/JV-2026-001`
- **User context**: Authenticated as `attacker-id`
- **Attempt**: Overwrite / tamper with historical transaction lines.
```json
{
  "id": "JV-2026-001",
  "date": "2026-07-08",
  "reference": "JV-2026-001",
  "description": "Tampered description",
  "lines": []
}
```

### Payload 10: Invalid Journal Entry Types (Format Poisoning)
- **Path**: `/users/attacker-id/journalEntries/JV-2026-001`
- **User context**: Authenticated as `attacker-id`
- **Attempt**: Create a transaction where `lines` is a string instead of an Array of line objects.
```json
{
  "id": "JV-2026-001",
  "date": "2026-07-08",
  "reference": "JV-2026-001",
  "description": "Invalid format lines",
  "lines": "debit-credit-string-malicious"
}
```

### Payload 11: Massive Description Injection (Storage Exhaustion)
- **Path**: `/users/attacker-id/journalEntries/JV-2026-001`
- **User context**: Authenticated as `attacker-id`
- **Attempt**: Submit description string exceeding 500 characters.
```json
{
  "id": "JV-2026-001",
  "date": "2026-07-08",
  "reference": "JV-2026-001",
  "description": "M".repeat(5000),
  "lines": []
}
```

### Payload 12: Anonymous Access (Auth Gate Protection)
- **Path**: `/users/attacker-id`
- **User context**: Unauthenticated
- **Attempt**: Create or retrieve a user profile document without credentials.

---

## 3. Test Runner Blueprint
Below is the design spec for verifying these rules. All security rule validations are designed to prevent escalation, identity leakage, and type-poisoning.
