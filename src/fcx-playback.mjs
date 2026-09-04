export function playConcurrently(players) {
  // Complete the synchronous play() invocation pass before observing results.
  // A thrown play() is converted to a rejection so it cannot prevent later
  // players in the same snapshot from receiving their start request.
  const attempts = players.map((player) => {
    try { return Promise.resolve(player.play()); } catch (error) { return Promise.reject(error); }
  });
  return Promise.allSettled(attempts);
}
