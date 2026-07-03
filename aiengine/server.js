import app from './app.js';

const PORT = process.env.PORT || 3008;

app.listen(PORT, () => {
  console.log(`AI Engine API listening on port ${PORT}`);
});