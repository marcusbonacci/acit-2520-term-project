import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { readDb, writeDb } from "../../database/database.js";

const JWT_SECRET = "secret";

export default {
  async register({ username, password, profilePicture }) {
    // DONE: get ahold of the db using readDb();
    const data = await readDb();
    // DONE: check if there is an existing user with the same username
    // DONE: if there is, do the following:
    //       - construct a new Error("Username already taken");
    //       - set the statusCode of that error object to 400
    //       - throw the err
    if (data.users.find(user => user.username === username)) {
      const err = new Error("Username already taken");
      err.statusCode = 400
      throw err
    }

    // DONE: otherwise, create a user object. A user has:
    //       - id: a random string-based id (crypto.randomUUID())
    //       - username: a username
    //       - password: a password
    //       - profilePicture: their profile pic string or an empty string if no picture.
    const user = {
      id: crypto.randomUUID(),
      username: username,
      password: password,
      profilePicture: profilePicture || ""
    }
    // DONE:  push this user object into db.users
    data.users.push(user);

    // DONE:  call the writeDb(db) operation to save changes.
    writeDb(data);

    // DONE:  return the user object but without their password  (only id, username, profilePicture)
    delete user.password
    return user
  },

  async login({ username, password }) {
    // DONE: get ahold of the db using readDb();
    const data = await readDb();

    // DONE: check the database for a user with a matching username and password
    let user = data.users.find(user => user.username === username && user.password === password)

    // DONE: if there is no user:
    //       - construct a new Error("Invalid username or password");
    //       - set the statusCode of that error object to 401
    //       - throw the err
    if (!(user)) {
      const err = new Error("Invalid username or password");
      err.statusCode = 401;
      throw err
    }

    // DONE: remove password from returned user
    delete user.password

    // DONE: otherwise, create a login token. I'll help you out with this one:
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: "1h" })
  
    // DONE:  return an object that contains 2 things:
    //  - token
    //  - user : { id: user.id, username: user.username, profilePicture: user.profilePicture }
    return {
      token,
      user
    }
  },
};

export {JWT_SECRET}