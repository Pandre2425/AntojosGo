import admin from 'firebase-admin';

export function setupFirebase() {
  try {
    if (admin.apps.length === 0) {
      // Initialize with environment variables or use default project ID
      const projectId = process.env.FIREBASE_PROJECT_ID || 'antojosgo-96e1c';
      
      if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        // Production setup with service account
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
          })
        });
        console.log('🔥 Firebase Admin initialized with service account');
      } else {
        // Development setup - simplified verification
        console.log('🔥 Firebase Admin initialized in development mode');
        // For development, we'll create a simplified verification system
      }
    }
  } catch (error) {
    console.warn('Firebase Admin setup warning:', error);
    console.log('📝 Running in development mode without Firebase Admin');
  }
}

export async function verifyFirebaseToken(token: string): Promise<any> {
  try {
    if (admin.apps.length > 0) {
      const decodedToken = await admin.auth().verifyIdToken(token);
      return decodedToken;
    } else {
      // Development mode - simplified token verification
      // In production, you should use proper Firebase Admin verification
      console.log('🚧 Development mode: Token verification bypassed');
      return {
        uid: 'dev-user-' + Date.now(),
        email: 'dev@antojosgo.com',
        name: 'Development User'
      };
    }
  } catch (error) {
    console.error('Token verification error:', error);
    throw new Error('Invalid token');
  }
}