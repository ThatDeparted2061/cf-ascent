// ────────────────────────────────────────────────────────────────────────────
//  CLOUD SYNC — Firebase: Google sign-in + Firestore persistence.
//
//  Lazy-loaded: the Firebase SDK is dynamically imported only when the user
//  signs in (or has signed in before), so anonymous visitors pay zero bundle
//  cost. The app works fully without signing in (localStorage); signing in
//  mirrors progress + the last session to Firestore so everything follows the
//  user across devices. Merging is union-based — nothing checked off is lost.
//
//  Firestore layout:
//    users/{uid} = {
//      profile: { displayName, email, photoURL },
//      session: { platform, handle, params, ts },        // last analysis
//      progress: { [planSignature]: string[] },          // checked problem ids
//      updatedAt
//    }
//
//  Suggested security rules (Firebase console → Firestore → Rules):
//    rules_version = '2';
//    service cloud.firestore {
//      match /databases/{database}/documents {
//        match /users/{uid} { allow read, write: if request.auth != null && request.auth.uid == uid; }
//      }
//    }
// ────────────────────────────────────────────────────────────────────────────

// Safe to commit — Firebase web configs are public identifiers; actual
// security comes from the Firestore rules above.
const firebaseConfig = {
  apiKey: 'AIzaSyAXjtTO9rqYJC6TgsCpk3dFXyIvecRWCT8',
  authDomain: 'cf-ascent.firebaseapp.com',
  projectId: 'cf-ascent',
  storageBucket: 'cf-ascent.firebasestorage.app',
  messagingSenderId: '643362090740',
  appId: '1:643362090740:web:282b6943af705bcbaa38a1',
}

const SIGNED_FLAG = 'cf_ascent_was_signed_in'

let modsPromise = null

async function ensureInit() {
  if (!modsPromise) {
    modsPromise = (async () => {
      const [{ initializeApp }, authMod, fsMod] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
        import('firebase/firestore'),
      ])
      const app = initializeApp(firebaseConfig)
      return {
        auth: authMod.getAuth(app),
        db: fsMod.getFirestore(app),
        authMod,
        fsMod,
      }
    })()
  }
  return modsPromise
}

// Subscribe to auth state. Synchronous facade over the lazy SDK: if the user
// never signed in on this device, Firebase is never even downloaded.
export function watchAuth(callback) {
  let unsub = null
  let cancelled = false

  const wasSignedIn = (() => {
    try {
      return localStorage.getItem(SIGNED_FLAG) === '1'
    } catch {
      return false
    }
  })()

  if (!wasSignedIn) {
    callback(null)
  } else {
    ensureInit()
      .then(({ auth, authMod }) => {
        if (cancelled) return
        unsub = authMod.onAuthStateChanged(auth, callback)
      })
      .catch((e) => {
        console.warn('Firebase unavailable:', e)
        callback(null)
      })
  }

  return () => {
    cancelled = true
    if (unsub) unsub()
  }
}

export async function signInWithGoogle() {
  const { auth, authMod } = await ensureInit()
  const provider = new authMod.GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  const cred = await authMod.signInWithPopup(auth, provider)
  try {
    localStorage.setItem(SIGNED_FLAG, '1')
  } catch {
    /* ignore */
  }
  return cred.user
}

export async function signOutUser() {
  try {
    localStorage.removeItem(SIGNED_FLAG)
  } catch {
    /* ignore */
  }
  const { auth, authMod } = await ensureInit()
  await authMod.signOut(auth)
}

// ── Firestore document I/O ──────────────────────────────────────────────────

export async function fetchCloudState(uid) {
  const { db, fsMod } = await ensureInit()
  const snap = await fsMod.getDoc(fsMod.doc(db, 'users', uid))
  return snap.exists() ? snap.data() : null
}

let writeTimer = null
let pendingState = null

// Debounced merge-write — call as often as you like.
export function pushCloudState(uid, state) {
  pendingState = state
  if (writeTimer) clearTimeout(writeTimer)
  writeTimer = setTimeout(async () => {
    const s = pendingState
    pendingState = null
    try {
      const { db, fsMod } = await ensureInit()
      await fsMod.setDoc(fsMod.doc(db, 'users', uid), { ...s, updatedAt: Date.now() }, { merge: true })
    } catch (e) {
      console.warn('Cloud sync write failed:', e)
    }
  }, 900)
}
