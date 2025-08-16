const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => res.json({ status: 'snapshot-ready' }));
app.get('/', (req, res) => res.send('Snapshot Complete'));

app.listen(PORT, '0.0.0.0', () => {
    console.log('✓ SNAPSHOT READY');
    if (process.send) process.send('ready');
});