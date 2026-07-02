export function promptYesNo(question) {
    return new Promise((resolve) => {
      process.stdout.write(question);
      process.stdin.setEncoding('utf8');
      process.stdin.once('data', (data) => {
        const s = data.toString().trim().toLowerCase();
        resolve(s === 'y' || s === 'yes');
      });
    });
  }
  
  export function promptLine(question) {
    return new Promise((resolve) => {
      process.stdout.write(question);
      process.stdin.setEncoding('utf8');
      process.stdin.once('data', (data) => {
        resolve(data.toString().trim());
      });
    });
  }