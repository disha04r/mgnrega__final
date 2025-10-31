// backend server.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const PORT = process.env.PORT || 8080;
app.use(express.static(path.join(__dirname, '..', 'frontend')));
const DB = path.join(__dirname, 'data.db');
function openDb(){ return new sqlite3.Database(DB, sqlite3.OPEN_READONLY, (e)=>{ if(e) console.error(e.message); }); }
app.get('/api/meta', (req,res)=>{ try{ const st = fs.statSync(DB); return res.json({updated: st.mtime}); }catch(e){ return res.status(404).json({error:'no db'}); }});
app.get('/api/districts', (req,res)=>{ const db=openDb(); db.all("SELECT DISTINCT district FROM performance ORDER BY district", [], (err,rows)=>{ if(err) { res.status(500).json({error:err.message}); db.close(); return; } res.json(rows.map(r=>r.district)); db.close(); }); });
app.get('/api/district/:name', (req,res)=>{ const name=req.params.name; const db=openDb(); db.get("SELECT district, SUM(people) as people, SUM(mandays) as mandays, SUM(wages) as wages, SUM(works) as projects FROM performance WHERE district = ?", [name], (err,row)=>{ if(err){ res.status(500).json({error:err.message}); db.close(); return; } if(!row || !row.district){ res.status(404).json({error:'no data'}); db.close(); return; } db.all("SELECT month, mandays, wages, works FROM performance WHERE district = ? ORDER BY year_month DESC LIMIT 12", [name], (err2, rows)=>{ if(err2){ res.status(500).json({error:err2.message}); db.close(); return; } rows.reverse(); const trend = rows.map(r=>r.mandays); const labels = rows.map(r=>r.month); const wages_trend = rows.map(r=>r.wages); const works_trend = rows.map(r=>r.works); const summary={people:row.people||0, mandays:row.mandays||0, wages:row.wages||0, projects:row.projects||0, trend, trend_labels:labels, wages_trend, works_trend}; res.json({summary, fetched_at: fs.existsSync(DB)?fs.statSync(DB).mtime:null}); db.close(); }); }); });
app.get('/health',(req,res)=>res.json({ok:true,now:new Date()}));
app.listen(PORT, ()=>console.log('Server running on', PORT));
