const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt'); // Make sure bcrypt is required here as well

function initialize(passport, getUserByEmail) {
  const authenticateUser = async (email, password, done) => {
    try {
      // Get user from Firestore
      const snapshot = await getUserByEmail(email);
      if (!snapshot) {
        return done(null, false, { message: 'No user with that email' });
      }

      const user = snapshot.data(); // Use snapshot.data() to get the user data

      // Compare the provided password with the stored hashed password
      const isValid = await bcrypt.compare(password, user.password);
      if (isValid) {
        return done(null, user);
      } else {
        return done(null, false, { message: 'Password incorrect' });
      }
    } catch (err) {
      return done(err);
    }
  };

  // Use LocalStrategy for email and password authentication
  passport.use(new LocalStrategy({ usernameField: 'email' }, authenticateUser));

  // Serialize user to store in session
  passport.serializeUser((user, done) => {
    done(null, user.email); // Store the user's email in the session
  });

  // Deserialize user from session
  passport.deserializeUser(async (email, done) => {
    try {
      // Retrieve the user from Firestore using the email
      const snapshot = await getUserByEmail(email);
      if (snapshot) {
        done(null, snapshot.data()); // Pass the user data to the session
      } else {
        done(null, false); 
      }
    } catch (err) {
      done(err);
    }
  });
}

module.exports = initialize;