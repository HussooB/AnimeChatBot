const admin = require('./firebase-config/firebase-setup'); // Import firebase-setup.js
const db = admin.firestore(); // Access Firestore

async function testFirebase() {
  try {
    // Example: Write to Firestore
    const docRef = db.collection('test').doc('sampleDoc');
    await docRef.set({ message: 'Hello, Firebase!' });
    console.log('Test document written successfully!');
  } catch (error) {
    console.error('Error writing document:', error);
  }
}

testFirebase();