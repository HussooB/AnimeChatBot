const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const flash = require("express-flash");
const admin = require("firebase-admin");
require("dotenv").config();

const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();


const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://animechat-8854c.firebaseio.com",
});
const db = admin.firestore();


const genAI = new GoogleGenerativeAI(process.env.GENERATIVE_API_KEY);


app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(flash());


app.get("/", (req, res) => {
  res.render("index", { title: "Sign-Up", formTitle: "Sign-Up" });
});

app.post("/index", async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    await db.collection("users").add({
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword,
      character: req.body["anime-character"],
    });
    res.redirect("/log-in");
  } catch (err) {
    console.error("Error signing up:", err);
    res.redirect("/");
  }
});

app.get("/log-in", (req, res) => {
  res.render("log-in", { title: "Log-In", messages: req.flash() });
});

app.post("/log-in", async (req, res) => {
  try {
    const userRef = await db.collection("users").where("email", "==", req.body.email).get();
    if (userRef.empty) {
      req.flash("error", "No user found with this email.");
      return res.redirect("/log-in");
    }

    const user = userRef.docs[0].data();
    const match = await bcrypt.compare(req.body.password, user.password);

    if (match) {
      req.session.character = user.character;
      req.session.username = user.name;
      req.session.email = user.email; 
      res.redirect("/chat");
    } else {
      req.flash("error", "Invalid password.");
      res.redirect("/log-in");
    }
  } catch (err) {
    console.error("Error during login:", err);
    res.redirect("/log-in");
  }
});

app.get("/chat", (req, res) => {
  if (!req.session.username || !req.session.character) {
    return res.redirect("/log-in");
  }
  res.render("chat", {
    title: "AnimeChat",
    username: req.session.username,
    character: req.session.character,
  });
});

app.post("/chat", async (req, res) => {
  const prompt = req.body.prompt;
  const email = req.session.email;

  try {
   
    const chatHistoryRef = db.collection("chat_history").doc(email);
    const chatDoc = await chatHistoryRef.get();
    let chatHistory = [];

    if (chatDoc.exists) {
      chatHistory = chatDoc.data().messages || [];
    }

    
    const fullPrompt = chatHistory.map(msg => `${msg.user}: ${msg.message}`).join("\n") + `\nUser: ${prompt}\nAI:`;

    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    
    const result = await model.generateContent(fullPrompt);
    const aiResponse = result.response.text();

    
    chatHistory.push({ user: "User", message: prompt });
    chatHistory.push({ user: "AI", message: aiResponse });

    
    await chatHistoryRef.set({ messages: chatHistory });

    res.json({ aiResponse });
  } catch (error) {
    console.error("Error with Gemini API or Firestore:", error);
    res.json({ aiResponse: "An error occurred while fetching the AI response." });
  }
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/log-in");
  });
});

app.listen(3000, () => console.log("Server started on port 3000"));