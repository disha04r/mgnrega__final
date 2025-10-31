
/**
 * ETL script: fetch MGNREGA Karnataka resource and populate SQLite DB.
 * Uses RESOURCE_ID for Karnataka district monthly performance.
 * API key is embedded here for convenience; for production move to env variables.
 */
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const DB = path.join(__dirname, 'data.db');
const RESOURCE_ID = 'baf1b4f3-611d-4f2a-b6a8-fdc88a6d6a52';
const API_KEY = '579b464db66ec23bdd0000016d1bab27a81547ef6f22605c1fbf4bc4';
const BASE = 'https://api.data.gov.in/resource';

async function fetchAll(){
  let all=[]; let offset=0; const limit=1000;
  try{
    while(true){
      const url = BASE + '/' + RESOURCE_ID + '?api-key=' + API_KEY + '&format=json&limit=' + limit + '&offset=' + offset;
      console.log('Fetching', url);
      const r = await axios.get(url,{timeout:30000});
      if(r.data && r.data.records && r.data.records.length>0){ all = all.concat(r.data.records); offset += r.data.records.length; if(r.data.records.length < limit) break; } else break;
    }
  }catch(e){ console.error('Fetch error', e.message); }
  return all;
}

function normalize(records){
  const out=[];
  records.forEach(rec=>{
    const district = rec.district || rec.district_name || rec.District || 'Unknown';
    const ym = rec.year_month || rec._year || (rec.year?String(rec.year):null) || '2025-01';
    const month_label = rec.month || rec._month || ym;
    const people = Number(rec.people_worked || rec.total_workers || 0);
    const mandays = Number(rec.mandays || rec.total_mandays || 0);
    const wages = Number(rec.expenditure || rec.wages_paid || 0);
    const works = Number(rec.no_of_works || rec.works || 0);
    out.push({district, year_month: ym, month: month_label, people, mandays, wages, works});
  });
  return out;
}

async function main(){
  const records = await fetchAll();
  const rows = normalize(records);
  const db = new sqlite3.Database(DB);
  db.serialize(()=>{
    db.run(`CREATE TABLE IF NOT EXISTS performance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      district TEXT,
      year_month TEXT,
      month TEXT,
      people INTEGER,
      mandays INTEGER,
      wages INTEGER,
      works INTEGER
    )`);
    db.run('DELETE FROM performance');
    const stmt = db.prepare('INSERT INTO performance (district, year_month, month, people, mandays, wages, works) VALUES (?,?,?,?,?,?,?)');
    rows.forEach(r=> stmt.run([r.district, r.year_month, r.month, r.people, r.mandays, r.wages, r.works]));
    stmt.finalize();
    db.close();
    console.log('DB updated with', rows.length, 'rows');
  });
}
main().catch(e=>console.error(e));
