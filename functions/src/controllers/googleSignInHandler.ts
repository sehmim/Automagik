import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v2';

// Initialize Firebase Admin SDK
// admin.initializeApp();

interface UserInfo {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  email: string;
}

// Google Sign-In Handler - Called after client-side sign-in
export const googleSignInHandler = functions.https.onRequest(async (req: any, res: any) => {
  try {
    const { idToken } = req.body; // The ID token from the client (Google sign-in token)

    if (!idToken) {
      return res.status(400).json({ error: 'ID Token is required.' });
    }

    // Verify the ID token with Firebase Authentication
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Get the user ID (uid) from decoded token
    const uid = decodedToken.uid;

    // Check if the user exists in Firebase Authentication
    // let userRecord;
    try {
      await admin.auth().getUser(uid);
    } catch (error) {
        
    //   if (error?.code === 'auth/user-not-found') {
    //     // If user does not exist, create the user in Firebase Authentication
    //     userRecord = await admin.auth().createUser({
    //       uid,
    //       displayName: req.body.name,
    //       email: req.body.email,
    //       photoURL: req.body.picture,
    //     });
    //   } else {
        throw new Error('Error verifying user in Firebase Authentication');
    //   }
    }

    // Create a user data object for Firestore
    const userInfo: UserInfo = {
      sub: decodedToken.sub,
      name: req.body.name,
      given_name: req.body.given_name,
      family_name: req.body.family_name,
      picture: req.body.picture,
      email: req.body.email
    };

    // Check if the user exists in Firestore, and create if not
    const userRef = admin.firestore().collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      // If the user doesn't exist in Firestore, create a new document
      await userRef.set(userInfo);
      console.log('New user created in Firestore');
    } else {
      console.log('User already exists in Firestore');
    }

    // Respond with success
    res.status(200).json({
      message: 'User signed in and created successfully.',
      user: userInfo,
    });

  } catch (error) {
    console.error('Error during Google sign-in:', error);
    res.status(500).json({
      error: 'Error during Google sign-in.',
      details: error || error,
    });
  }
});
