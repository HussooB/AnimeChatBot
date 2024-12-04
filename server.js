const express = require('express');
const passport = require('passport');
const bcrypt = require('bcrypt');
const flash = require('express-flash');
const session = require('express-session');
const initializePassport = require('./passport-config');
const admin = require('firebase-admin');
require('dotenv').config(); // Load .env variables

// Initialize Firebase Admin SDK
const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH); // Load service account credentials from the .env file
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://animechat-8854c.firebaseio.com',
});
const db = admin.firestore();

const app = express();

// Passport initialization
initializePassport(
  passport, 
  (email) => db.collection('users').where('email', '==', email).get().then((snapshot) => {
    return snapshot.empty ? null : snapshot.docs[0].data();
  })
);

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(flash());
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.get('/', (req, res) => {
  res.render('index', { title: 'Sign-Up', formTitle: 'Sign-Up Form' });
});

app.post('/index', async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    // Add user data to Firestore
    await db.collection('users').add({
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword,
      character: req.body['anime-character'], // Store selected character
    });

    res.redirect('/log-in');
  } catch (err) {
    console.error(err);
    res.redirect('/');
  }
});

app.get('/log-in', (req, res) => {
  res.render('log-in', {
    title: 'Log-In Page',
    messages: req.flash(),
  });
});

app.post('/log-in', async (req, res, next) => {
  try {
    const userRef = await db.collection('users').where('email', '==', req.body.email).get();

    if (userRef.empty) {
      console.log('No user found with email:', req.body.email); // Debugging line
      return res.redirect('/log-in'); // User not found
    }

    const user = userRef.docs[0].data();
    const match = await bcrypt.compare(req.body.password, user.password);
    console.log('Password Match:', match); // Debugging line for /log-in route

    if (match) {
      // User authenticated, proceed to chat page
      req.login(user, (err) => {
        if (err) {
          console.error('Login Error:', err); // Debugging line
          return next(err);
        }
        res.redirect('/chat');
      });
    } else {
      // Invalid password
      req.flash('error', 'Invalid password');
      res.redirect('/log-in');
    }
  } catch (err) {
    console.error('Error in /log-in route:', err); // Debugging line
    res.redirect('/log-in');
  }
});

app.get('/chat', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/log-in');
  }
  res.render('chat', {
    title: 'AnimeChat',
    username: req.user.name,
    character: 'Naruto Uzumaki', // Replace with user-specific data if available
  });
});

app.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect('/log-in');
  });
});

app.listen(3000, () => console.log('Server started on port 3000'));
