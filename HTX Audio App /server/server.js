import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import pg from "pg";
import cookieParser from "cookie-parser";
import path from "path";
import chalk from "chalk";
import fs from "fs";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173"],
    methods: ["POST", "GET"],
    credentials: true,
  })
);
app.use(cookieParser());

const pool = new pg.Pool({
  user: "users",
  host: "db",
  database: "users_auth",
  password: "1234",
  port: 5432,
});

// AWS information here
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWSAccessKeyId,
    secretAccessKey: process.env.AWSSecretAccessKey,
  },
});

// Read the consts) {tents of the user.schema.sql file
const schemaFilePath = path.resolve("./user.schema.sql");
const schemaSQL = fs.readFileSync(schemaFilePath, "utf-8");

// Create schema tables if they do not exist
const createTables = async () => {
  console.log("Calling createTables");
  try {
    const statements = schemaSQL
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0);

    for (const stmt of statements) {
      await pool.query(stmt);
    }
    console.log(chalk.greenBright("Tables created successfully"));
  } catch (error) {
    console.error(chalk.red("Error creating tables:"), error);
  }
};

const connectDB = async () => {
  try {
    await pool.connect();
    console.log(chalk.greenBright("Database connected successfully"));
  } catch (error) {
    console.error(chalk.red("Error connecting to database:"), error);
  }
};

// Create API here
app.post("/update", async (req, res) => {
  try {
    let { name, username, password, cookiesName, cookiesUsername } = req.body;
    // Check if user data is provided
    if (!username && !name && !password) {
      return res.status(400).json({
        message: "Please provide user details to update",
      });
    }
    if (username && username != cookiesUsername) {
      // Check whether username has an existing user
      const user = await pool.query("SELECT * FROM users WHERE username = $1", [
        username,
      ]);
      if (user.rows.length > 0) {
        return res.status(400).json({
          message: "This username is taken. Please choose another username",
        });
      } else if (user.rows.length === 0) {
        await pool.query("UPDATE users SET username = $1 WHERE username = $2", [
          username,
          cookiesUsername,
        ]);
        // Update the rows in the audio table
        await pool.query("UPDATE audio SET username = $1 WHERE username = $2", [
          username,
          cookiesUsername,
        ]);
        cookiesUsername = username;
      }
    }
    if (name) {
      // Update the record corresponding to the current user
      cookiesName = name;
      await pool.query("UPDATE users SET full_name = $1 WHERE username = $2", [
        cookiesName,
        cookiesUsername,
      ]);
    }
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      await pool.query("UPDATE users SET pw = $1 WHERE username = $2", [
        hashedPassword,
        cookiesUsername,
      ]);
    }
    // Clear the cookies and set the modified information there
    const token = jwt.sign(
      { name: cookiesName, username: cookiesUsername },
      "jwt-secret-key",
      { expiresIn: "1d" }
    );
    res.clearCookie("token");
    res.cookie("token", token);
    return res.status(200).json({
      message: "User details have been successfully updated",
      name: cookiesName,
      username: cookiesUsername,
    });
  } catch (err) {
    console.log("error with update");
    console.log(err);
  }
});

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({
        message: "Please provide all user details",
      });
    }
    // Check if user exists
    const user = await pool.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);
    if (user.rows.length === 0) {
      return res.status(400).json({
        message: "User does not exist",
      });
    }
    // Compare the password
    const validPassword = await bcrypt.compare(password, user.rows[0].pw);
    if (!validPassword) {
      return res.status(400).json({
        message: "Invalid password",
      });
    }
    // Generate token for cookies if the username and password are correct
    const name = user.rows[0].full_name;
    const token = jwt.sign({ name, username }, "jwt-secret-key", {
      expiresIn: "1d",
    });
    res.cookie("token", token);
    // Return user data
    return res.status(200).json({
      message: "User logged in successfully",
      user: {
        id: user.rows[0].id,
        username: user.rows[0].username,
        name: user.rows[0].full_name,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

const verifyUser = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.json({ Error: "You are not Authenticated" });
  } else {
    jwt.verify(token, "jwt-secret-key", (err, decoded) => {
      if (err) {
        return res.json({ Error: "Token is not correct" });
      } else {
        req.username = decoded.username;
        req.name = decoded.name;
        next();
      }
    });
  }
};

app.get("/", verifyUser, async (req, res) => {
  return res.json({
    status: "Success",
    name: req.name,
    username: req.username,
  });
});

app.get("/logout", (req, res) => {
  res.clearCookie("token");
  return res.json({ status: "Success" });
});

app.post("/register", async (req, res) => {
  try {
    const { name, username, password } = req.body;
    if (!username && !password) {
      return res.status(400).json({
        message: "Please provide all user details",
      });
    }
    // Check if user exists
    const user = await pool.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);
    if (user.rows.length > 0) {
      return res.status(400).json({
        message: "User with this username already exists",
      });
    }
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    // Execute SQL query to insert user into the database
    const query = `
      INSERT INTO users (full_name, username, pw)
      VALUES ($1, $2, $3)
    `;
    await pool.query(query, [name, username, hashedPassword]);
    // Return user data
    return res.status(200).json({
      message: "User registered successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

app.post("/deleteAccount", async (req, res) => {
  try {
    const username = req.body.usernameToDelete;
    await pool.query("DELETE FROM users WHERE username = $1", [username]);
    // Clear cookie
    res.clearCookie("token");
    return res.status(200).json({ message: "User account has been deleted" });
  } catch (err) {
    console.log("Error deleting account");
    console.log(err);
  }
});

// Function to format current date and time for upload into SQL
function formatDateInSG() {
  const now = new Date();
  const options = {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };

  // Use formatToParts to get individual date components
  const parts = new Intl.DateTimeFormat("en-US", options).formatToParts(now);
  const day = parts.find((part) => part.type === "day").value;
  const month = parts.find((part) => part.type === "month").value;
  const year = parts.find((part) => part.type === "year").value;
  const hour = parts.find((part) => part.type === "hour").value;
  const minute = parts.find((part) => part.type === "minute").value;
  const dayPeriod = parts
    .find((part) => part.type === "dayPeriod")
    .value.toLowerCase();

  return `${day} ${month} ${year}, ${hour}:${minute}${dayPeriod}`;
}

// Endpoint for uploading audio files
app.post("/uploadFile", async (req, res) => {
  try {
    const { username, fileName, category, description, s3URL } = req.body;
    const currTime = formatDateInSG();
    // Insert information into database
    const query = `
      INSERT INTO audio (audio_category, audio_description, s3_url, created_at, username, file_name)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    await pool.query(query, [
      category,
      description,
      s3URL,
      currTime,
      username,
      fileName,
    ]);
    return res.status(200).json({
      message: "Audio information has been saved successfully",
    });
  } catch (err) {
    return res.status(400).json({
      message: "Error with saving audio information",
    });
  }
});

// Endpoint for retrieving audio files uploaded by user
app.post("/getUploads", async (req, res) => {
  try {
    const username = req.body.username;
    const result = await pool.query(
      "SELECT * FROM audio WHERE username = $1 ORDER BY id DESC",
      [username]
    );
    if (result.rows.length === 0) {
      return res.status(200).json({
        message: "No history of audio uploads",
      });
    } else if (result.rows.length > 0) {
      return res.status(200).json({
        message: "Previous history of audio uploads",
        uploads: result.rows,
      });
    }
  } catch (err) {
    return res.status(400).json({
      message: "Error with retrieving past uploads",
    });
  }
});

// Endpoint for deleting audio from Postgres and AWS
app.post("/deleteAudio", async (req, res) => {
  try {
    const filename = req.body.filename;
    // Delete from AWS
    const aws_delete = await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET,
        Key: filename,
      })
    );
    const full_url = `https://${process.env.AWS_BUCKET}.s3.amazonaws.com/${filename}`;
    await pool.query("DELETE FROM audio WHERE s3_url = $1", [full_url]);
    return res.status(200).json({ message: "File has been deleted" });
  } catch (err) {
    console.error("Error during deleteAudio:", err);
    return res.status(400).json({
      message: "Error with deleting audio file",
    });
  }
});

connectDB();

app.listen(3000, () => {
  console.log("Running ..");
  createTables();
});
