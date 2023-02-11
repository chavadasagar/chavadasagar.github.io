export function generateUniqueNumber(n) {
    let uniqueNumber = "";
    for (let i = 0; i < n; i++) {
      uniqueNumber += Math.floor(Math.random() * n);
    }
    return uniqueNumber;
  }