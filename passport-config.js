const LocalStrategy = require('passport-local').Strategy;

function initialize(passport, getUserByEmail) {
  const authenticateUser = async (email, password, done) => {
    try {
      const snapshot = await getUserByEmail(email);
      if (!snapshot) {
        return done(null, false, { message: 'No user with that email' });
      }

      const user = snapshot; // Firestore returns user data directly
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

  passport.use(new LocalStrategy({ usernameField: 'email' }, authenticateUser));

  // Serialize user to store in the session
  passport.serializeUser((user, done) => {
    done(null, user.email); // Save user email (or any unique identifier)
  });

  // Deserialize user from session
  passport.deserializeUser(async (email, done) => {
    try {
      const snapshot = await getUserByEmail(email);
      if (snapshot) {
        done(null, snapshot);
      } else {
        done(null, false); // User not found
      }
    } catch (err) {
      done(err);
    }
  });
}

module.exports = initialize;