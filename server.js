const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve frontend files

// Load data
app.get('/api/data', (req, res) => {
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) return res.json({ projects: [] });
        try {
            res.json(JSON.parse(data));
        } catch {
            res.json({ projects: [] });
        }
    });
});

// Save data
app.post('/api/data', (req, res) => {
    fs.writeFile(DATA_FILE, JSON.stringify(req.body, null, 2), err => {
        if (err) return res.status(500).json({ error: 'Failed to save' });
        // Also update CSV file
        const projects = req.body.projects || [];
        let csv = 'Project,Start,End,Duration (hours)\n';
        projects.forEach(p => {
            (p.logs || []).forEach(log => {
                const hours = (log.duration / 3600).toFixed(2);
                csv += `"${p.name}","${new Date(log.start).toISOString()}","${new Date(log.end).toISOString()}",${hours}\n`;
            });
        });
        fs.writeFile(path.join(__dirname, 'timelogger_data.csv'), csv, () => { });
        res.json({ ok: true });
    });
});

// Export CSV
app.get('/api/export/csv', (req, res) => {
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        let projects = [];
        if (!err) {
            try {
                projects = JSON.parse(data).projects || [];
            } catch { }
        }
        let csv = 'Project,Start,End,Duration (hours)\n';
        projects.forEach(p => {
            (p.logs || []).forEach(log => {
                const hours = (log.duration / 3600).toFixed(2);
                csv += `"${p.name}","${new Date(log.start).toISOString()}","${new Date(log.end).toISOString()}",${hours}\n`;
            });
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="timelogger_data.csv"');
        res.send(csv);
    });
});

// Export JSON
app.get('/api/export/json', (req, res) => {
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="timelogger_data.json"');
        res.send(err ? '{"projects":[]}' : data);
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
}); 