import app from './server/app.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Node.js/Express server listening on http://localhost:${PORT}`);
});
