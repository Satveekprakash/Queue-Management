const Counter = require("../models/counter");

async function getNextToken() {
  const counter = await Counter.findOneAndUpdate(
    { name: "queueToken" },
    { $inc: { value: 1 } },
    {
      new: true,
      upsert: true, // create if not exists
    }
  );

  return counter.value;
}

module.exports = { getNextToken };