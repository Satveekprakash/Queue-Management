const AVG_TIME_PER_PATIENT = 15;

function calculateExpectedTime(patAhead) {
  patAhead = Number(patAhead);
  if (isNaN(patAhead) || patAhead < 0) patAhead = 0;

  const now = new Date(); // real current time

  const totalMinutes = patAhead * AVG_TIME_PER_PATIENT;
  now.setMinutes(now.getMinutes() + totalMinutes);

  return now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
module.exports=calculateExpectedTime;