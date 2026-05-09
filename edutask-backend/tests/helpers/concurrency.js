async function runConcurrent(fn, count) {
  const jobs = [];
  for (let i = 0; i < count; i += 1) {
    jobs.push(fn(i));
  }
  return Promise.allSettled(jobs);
}

module.exports = {
  runConcurrent,
};
