import { readDb, writeDb } from "../../database/database.js";
import crypto from "node:crypto";

export default {
  async findAll() {
    // DONE: get ahold of the db using readDb();
    const data = await readDb();

    return data.tips;
  },

  async create({ title, userId }) {
    // DONE: get ahold of the db using readDb();
    const data = await readDb();
    // DONE: create a tip object containing { id: "some-random-id", title, userId }
    const tip = {id: crypto.randomUUID(), title: title, userId: userId};
    // DONE: push the tip object into tips list in the database
    data.tips.push(tip);
    // DONE: write changes to database with await writeDb(db)
    await writeDb(data);
    // DONE: return the id of the created tip
    return tip.id;
  },

  async update({ id, title, userId }) {
    // DONE: get ahold of the db using readDb();
    const data = await readDb();

    // DONE: find a tip in the db whose id & userId matches the incoming id & userId
    const tip = data.tips.find(tip => tip.id === id && tip.userId === userId);

    // DONE: if there is no matching tip, return false.
    if (!(tip)) return false;

    // DONE: otherwise, set the found tip's title to the incoming title
    tip.title = title;

    // DONE: write changes to database with await writeDb(db)
    await writeDb(data);

    // DONE: return true
    return true;
  },

  async remove({ id, userId }) {
    // DONE: get ahold of the db using readDb();
    const data = await readDb();

    // DONE: find the INDEX of the tip in the db whose id & userId match the incoming id & userId
    const tipIndex = data.tips.findIndex(tip => tip.id === id && tip.userId === userId);

    // DONE: if there is no index (-1), return false.
    if (tipIndex === -1) return false;

    // DONE: otherwise, use splice to delete from db.tips the tip based on the index
    data.tips.splice(tipIndex, 1)

    // DONE: write changes to database with await writeDb(db)
    await writeDb(data);

    // DONE: return true
    return true;
  },
};
