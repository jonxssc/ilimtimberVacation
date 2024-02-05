var http = require('http');
var express = require('express');
var bodyParser = require('body-parser'); // Add this line to parse the request body
const sql = require('mssql');
const nodemailer = require('nodemailer');
var app = express();

// Add middleware to parse the request body as JSON
app.use(bodyParser.json());
const emailDisclaimer = '[!jonas.schaller@ilimtimber.eu Projektarbeit > Nicht beachten] ';

const config = {
  user: 'intranet',
  password: '***',
  server: '***',
  database: 'Intranet',
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};
const transporter = nodemailer.createTransport({
  service: 'postfix',
  host: 'localhost',
  secure: false,
  port: 25,
  auth: { user: 'root', pass: 'itb!SrvAdm' },
  tls: { rejectUnauthorized: false }
});

// Default route
app.get('/', function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Apache2 Server Working');
});

app.get('/genehmiger', function (req, res) {
  sql.connect(config)
  .then(pool => {return pool.request().query("SELECT * FROM genehmiger WHERE aktiv='1' ORDER BY name")})
  .then(result => {
    res.json(result);
  }).catch(err => {
    console.error(err);
  }).finally(() => {
    sql.close();
  });
});


const antragArt = [
  {art:'Erholungsurlaub',title:'einen neuen Erholungsurlaub'},
  {art:'Sonderurlaub',title:'einen neuen Sonderurlaub'},
  {art:'Zeitkorrektur',title:'eine neue Zeitkorrektur'},
  {art:'Dienstreise',title:'eine neue Dienstreise'},
  {art:'Zeitausgleich gewerblich',title:'einen neuen gewerblichen Zeitausgleich'},
  {art:'Sonstiges',title:'einen neuen Sonstigen Antrag'},
]
// Change the route to handle POST requests
app.post('/newAntrag', function (req, res) {
  const {
    antrag,
    userVorname,
    userNachname,
    userAbteilung,
    vertretungVorname,
    vertretungNachname,
    datetimeVon,
    datetimeBis,
    dateVon,
    dateBis,
    kommentar,
    genehmiger,
  } = req.body;
  const userEmail = userVorname+'.'+userNachname+'@ilimtimber.eu';
  const log_key = 'log_'+new Date().getTime()+Math.floor(Math.random()*1000);
  const edit_key = new Date().getTime()+Math.floor(Math.random()*100000/120);

  if(antrag=="2"){
    sql.connect(config).then(pool => {
      const request = pool.request();
      request.input('log_key', sql.NVarChar, log_key.toString());
      request.input('edit_key', sql.NVarChar, edit_key.toString());
      request.input('antrag', sql.TinyInt, parseInt(antrag));
      request.input('userVorname', sql.NVarChar, userVorname.toString());
      request.input('userNachname', sql.NVarChar, userNachname.toString());
      request.input('vertretungVorname', sql.NVarChar, vertretungVorname?vertretungVorname.toString():null);
      request.input('vertretungNachname', sql.NVarChar, vertretungVorname?vertretungNachname.toString():null);
      request.input('userAbteilung', sql.NVarChar, userAbteilung.toString());
      request.input('startDate', sql.DateTime, new Date(`${dateVon}Z`));
      request.input('endDate', sql.DateTime, new Date(`${dateBis}Z`));
      request.input('kommentar', sql.NVarChar, kommentar.toString());
      request.input('genehmiger', sql.NVarChar, genehmiger.toString());
      return request.query(`
      INSERT INTO zeitmgm (log_key, edit_key, antrag_art, p_vorname, p_nachname, v_vorname, v_nachname, abteilung, dtime_start, dtime_end, kommentar, genehmiger)
      VALUES (@log_key, @edit_key, @antrag, @userVorname, @userNachname, @vertretungVorname, @vertretungNachname, @userAbteilung, @startDate, @endDate, @kommentar, @genehmiger)
    `);
    })
    .then(result => console.log('Record inserted successfully:', result))
    .catch(err => console.error('Error inserting record:', err))
    .finally(() => sql.close());
  }else{
    sql.connect(config).then(pool => {
      const request = pool.request();
      request.input('log_key', sql.NVarChar, log_key.toString());
      request.input('edit_key', sql.NVarChar, edit_key.toString());
      request.input('antrag', sql.TinyInt, parseInt(antrag));
      request.input('userVorname', sql.NVarChar, userVorname.toString());
      request.input('userNachname', sql.NVarChar, userNachname.toString());
      request.input('vertretungVorname', sql.NVarChar, vertretungVorname?vertretungVorname.toString():null);
      request.input('vertretungNachname', sql.NVarChar, vertretungVorname?vertretungNachname.toString():null);
      request.input('userAbteilung', sql.NVarChar, userAbteilung.toString());
      request.input('startDate', sql.DateTime, new Date(`${datetimeVon}Z`));
      request.input('endDate', sql.DateTime, new Date(`${datetimeBis}Z`));
      request.input('kommentar', sql.NVarChar, kommentar.toString());
      request.input('genehmiger', sql.NVarChar, genehmiger.toString());
      return request.query(`
      INSERT INTO zeitmgm (log_key, edit_key, antrag_art, p_vorname, p_nachname, v_vorname, v_nachname, abteilung, utime_start, utime_end, kommentar, genehmiger)
      VALUES (@log_key, @edit_key, @antrag, @userVorname, @userNachname, @vertretungVorname, @vertretungNachname, @userAbteilung, @startDate, @endDate, @kommentar, @genehmiger)
    `);
    })
    .then(result => {
      console.log('Record inserted successfully:', result)
      // Bestätigung Antragsteller
      const mailOptionsAntragsteller = {
        from: 'no-reply@ilimtimber.eu',
        to: userEmail,
        subject: `${emailDisclaimer}Ihr Antrag wurde erfolgreich eingereicht (${log_key})`,
        html: `<!DOCTYPE html><html> <head> <meta charset="utf-8"> <title>Email</title> </head> <body> <style> html, body { overflow-x: hidden; font-family: "Calibri"; color: #4d4d4d; margin: 0px; padding: 0px; width: 100%; height: 100%; } .mail_all h1, .mail_all p { margin: 0; } .mail_all a { text-decoration: none; color: #19bd26; font-weight: bold; } </style> <div class="mail_all"> <h2>${antragArt[antrag].art} eingereicht</h2> <p>Status abrufen <a href="http://172.24.10.28/projekt/antrag.html?key=${log_key}">[Hier Klicken]</a></p></div></body></html>`
      };
      transporter.sendMail(mailOptionsAntragsteller,(error,info) => {
        if(error){return console.error('Error occurred:',error.message)}
        console.log('Email sent:', info.messageId);
      });
    
      // Bestätigung Genehmiger
      const mailOptionsGenehmiger = {
        from: 'no-reply@ilimtimber.eu',
        to: genehmiger,
        subject: `${emailDisclaimer}${userVorname} ${userNachname} hat ${antragArt[antrag].title} eingereicht (${log_key})`,
        html: `<!DOCTYPE html><html> <head> <meta charset="utf-8"> <title>Email</title> </head> <body> <style> html, body { overflow-x: hidden; font-family: "Calibri"; font-family: "Segoe UI"; color: #4d4d4d; margin: 0px; padding: 0px; width: 100%; height: 100%; } .mail_all h1, .mail_all p { margin: 0; } .mail_all a { text-decoration: none; color: #19bd26; font-weight: bold; } </style> <div class="mail_all"> <h2>${antragArt[antrag].art} zur Bearbeitung</h2> <p>Antrag verwalten <a href="http://172.24.10.28/projekt/antrag.html?key=${log_key}&edit_key=${edit_key}">[Hier Klicken]</a></p></div></body></html>`
      };
      transporter.sendMail(mailOptionsGenehmiger,(error,info) => {
        if(error){return console.error('Error occurred:',error.message)}
        console.log('Email sent:', info.messageId);
      });
    
      //// Bestätigung Vertretung
      if(vertretungVorname){
        const mailOptionsVertretung = {
          from: 'no-reply@ilimtimber.eu',
          to: vertretungVorname+'.'+vertretungNachname+'@ilimtimber.eu',
          subject: `${emailDisclaimer}${userVorname} ${userNachname} hat ${antragArt[antrag].title} eingereicht und Sie als Vertretung eingetragen (${log_key})`,
          html: `<!DOCTYPE html><html> <head> <meta charset="utf-8"> <title>Email</title> </head> <body> <style> html, body { overflow-x: hidden; font-family: "Calibri"; color: #4d4d4d; margin: 0px; padding: 0px; width: 100%; height: 100%; } .mail_all h1, .mail_all p { margin: 0; } .mail_all a { text-decoration: none; color: #19bd26; font-weight: bold; } </style> <div class="mail_all"> <h2>${antragArt[antrag].art} eingereicht (Sie sind die Vertretung)</h2> <p>Status abrufen <a href="http://172.24.10.28/docs/projekt/antrag.html?key=${log_key}">[Hier Klicken]</a></p></div></body></html>`
        };
        transporter.sendMail(mailOptionsVertretung,(error,info) => {
          if(error){return console.error('Error occurred:',error.message)}
          console.log('Email sent:', info.messageId);
        });
      }
    
      res.status(200).json({log_key:log_key});
    })
    .catch(err => console.error('Error inserting record:', err))
    .finally(() => sql.close());
  }
});


app.post('/getEntry', function (req, res) {
  const {key} = req.body;
  sql.connect(config)
  .then(pool => {return pool.request().query("SELECT status, log_key, antrag_art, p_vorname, p_nachname, v_vorname, v_nachname, abteilung, dtime_start, dtime_end, utime_start, utime_end, kommentar, genehmiger FROM zeitmgm WHERE log_key='"+key.toString()+"'")})
  .then(result => {
    res.json(result);
  }).catch(err => {
    console.error(err);
  }).finally(() => {
    sql.close();
  });
});


app.post('/getEditor', function (req, res) {
  const {logKey,editKey} = req.body;
  sql.connect(config)
  .then(pool => {return pool.request().query("SELECT edit_key FROM zeitmgm WHERE log_key='"+logKey.toString()+"' AND edit_key='"+editKey.toString()+"'")})
  .then(result => {
    res.json(result);
  }).catch(err => {
    console.error(err);
  }).finally(() => {
    sql.close();
  });
});


function formatDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2,'0');
  const day = String(date.getUTCDate()).padStart(2,'0');
  const hours = String(date.getUTCHours()).padStart(2,'0');
  const minutes = String(date.getUTCMinutes()).padStart(2,'0');
  const seconds = String(date.getUTCSeconds()).padStart(2,'0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}
function formatDateHalf(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2,'0');
  const day = String(date.getUTCDate()).padStart(2,'0');
  return `${year}${month}${day}T000000`;
}
let acceptAntragPool = null;
app.post('/acceptAntrag', async function (req, res) {
  const {logKey,editKey} = req.body;
  try {
    acceptAntragPool = await sql.connect(config);
    const request = acceptAntragPool.request();
    request.input('log_key', sql.NVarChar, logKey.toString());
    request.input('edit_key', sql.NVarChar, editKey.toString());
    await request.query(`UPDATE zeitmgm SET status=2 WHERE log_key = @log_key AND edit_key = @edit_key`);
    const selectResult = await request.query(`SELECT * FROM zeitmgm WHERE log_key = @log_key AND edit_key = @edit_key`);

    console.log(selectResult.recordset[0]);
    res.status(200).json(selectResult);

    let ics = null;
    if(selectResult.recordset[0].antrag_art==2){
      ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VTIMEZONE\nTZID:Europe/Berlin\nX-LIC-LOCATION:Europe/Berlin\nBEGIN:DAYLIGHT\nTZOFFSETFROM:+0100\nTZOFFSETTO:+0200\nTZNAME:CEST\nDTSTART:19700329T020000\nRRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=3\nEND:DAYLIGHT\nBEGIN:STANDARD\nTZOFFSETFROM:+0200\nTZOFFSETTO:+0100\nTZNAME:CET\nDTSTART:19701025T030000\nRRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10\nEND:STANDARD\nEND:VTIMEZONE\nBEGIN:VEVENT\nSUMMARY:${antragArt[selectResult.recordset[0].antrag_art].art} ${String(selectResult.recordset[0].p_vorname+' '+selectResult.recordset[0].p_nachname).trim()}\nDESCRIPTION:Wenn Sie jetzt auf [Speichern & schließen] drücken, wird dieser Termin in Ihren Kalender übertragen.\nCLASS:PUBLIC\nDTSTART;TZID=Europe/Berlin:${formatDateHalf(new Date(selectResult.recordset[0].dtime_start))}\nDTEND;TZID=Europe/Berlin:${formatDateHalf(new Date(selectResult.recordset[0].dtime_end))}\nEND:VEVENT\nEND:VCALENDAR`;
    }else{
      ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VTIMEZONE\nTZID:Europe/Berlin\nX-LIC-LOCATION:Europe/Berlin\nBEGIN:DAYLIGHT\nTZOFFSETFROM:+0100\nTZOFFSETTO:+0200\nTZNAME:CEST\nDTSTART:19700329T020000\nRRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=3\nEND:DAYLIGHT\nBEGIN:STANDARD\nTZOFFSETFROM:+0200\nTZOFFSETTO:+0100\nTZNAME:CET\nDTSTART:19701025T030000\nRRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10\nEND:STANDARD\nEND:VTIMEZONE\nBEGIN:VEVENT\nSUMMARY:${antragArt[selectResult.recordset[0].antrag_art].art} ${String(selectResult.recordset[0].p_vorname+' '+selectResult.recordset[0].p_nachname).trim()}\nDESCRIPTION:Wenn Sie jetzt auf [Speichern & schließen] drücken, wird dieser Termin in Ihren Kalender übertragen.\nCLASS:PUBLIC\nDTSTART;TZID=Europe/Berlin:${formatDate(new Date(selectResult.recordset[0].utime_start))}\nDTEND;TZID=Europe/Berlin:${formatDate(new Date(selectResult.recordset[0].utime_end))}\nEND:VEVENT\nEND:VCALENDAR`;
    }

    const mailOptionsAntragsteller = {
      from: 'no-reply@ilimtimber.eu',
      to: `
      ${String(selectResult.recordset[0].p_vorname+'.'+selectResult.recordset[0].p_nachname+'@ilimtimber.eu').trim()},
      ${selectResult.recordset[0].v_vorname&&String(selectResult.recordset[0].v_vorname+'.'+selectResult.recordset[0].v_nachname+'@ilimtimber.eu').trim()},
      ${String(selectResult.recordset[0].genehmiger).trim()},
      `,
      cc: 'Personal.Urlaubsverteiler@ilimtimber.eu',
      subject: `${emailDisclaimer}Ihr Antrag wurde angenommen (${logKey})`,
      html: `<!DOCTYPE html><html> <head> <meta charset="utf-8"> <title>Email</title> </head> <body> <style>html, body{overflow-x: hidden; font-family: "Calibri"; color: #4d4d4d; margin: 0px; padding: 0px; width: 100%; height: 100%;}.mail_all h1, .mail_all p{margin: 0;}.mail_all a{text-decoration: none; color: #19bd26; font-weight: bold;}</style> <div class="mail_all"> <span style="font-family: Helvetica !important;"> <h2>${antragArt[selectResult.recordset[0].antrag_art].art} wurde genehmigt</h2> <p>Status abrufen <a href="http://172.24.10.28/projekt/antrag.html?key=${logKey}">[Hier Klicken]</a></p></span><br><br><p>Wenn Sie den Anhang anklicken, werden diese Daten in Ihren Kalender eingetragen</p></div></body></html>`,
      attachments: [
        {
          filename: 'Kalender.ics',
          content: ics,
        }
      ]
    };
    transporter.sendMail(mailOptionsAntragsteller,(error,info) => {
      if(error){return console.error('Error occurred:',error.message)}
      console.log('Email sent:', info.messageId);
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error occurred');
  } finally {
    await acceptAntragPool.close();
  }
});


let denieAntragPool = null;
app.post('/denieAntrag', async function (req, res) {
  const {logKey,editKey} = req.body;
  try {
    denieAntragPool = await sql.connect(config);
    const request = denieAntragPool.request();
    request.input('log_key', sql.NVarChar, logKey.toString());
    request.input('edit_key', sql.NVarChar, editKey.toString());
    await request.query(`UPDATE zeitmgm SET status=0 WHERE log_key = @log_key AND edit_key = @edit_key`);
    const selectResult = await request.query(`SELECT * FROM zeitmgm WHERE log_key = @log_key AND edit_key = @edit_key`);

    console.log(selectResult.recordset[0]);
    res.status(200).json(selectResult);

    const mailOptionsAntragsteller = {
      from: 'no-reply@ilimtimber.eu',
      to: `${String(selectResult.recordset[0].p_vorname+'.'+selectResult.recordset[0].p_nachname+'@ilimtimber.eu').trim()},`,
      subject: `${emailDisclaimer}Ihr Antrag wurde abgelehnt (${logKey})`,
      html: `<!DOCTYPE html><html> <head> <meta charset="utf-8"> <title>Email</title> </head> <body> <style>html, body{overflow-x: hidden; font-family: "Calibri"; color: #4d4d4d; margin: 0px; padding: 0px; width: 100%; height: 100%;}.mail_all h1, .mail_all p{margin: 0;}.mail_all a{text-decoration: none; color: #19bd26; font-weight: bold;}</style> <div class="mail_all"> <span style="font-family: Helvetica !important;"> <h2>${antragArt[selectResult.recordset[0].antrag_art].art} wurde abgelehnt ✘</h2> <p>Status abrufen <a href="http://172.24.10.28/projekt/antrag.html?key=${logKey}">[Hier Klicken]</a></p></span><br><br><p>Wenn Sie den Anhang anklicken, werden diese Daten in Ihren Kalender eingetragen</p></div></body></html>`,
    };
    transporter.sendMail(mailOptionsAntragsteller,(error,info) => {
      if(error){return console.error('Error occurred:',error.message)}
      console.log('Email sent:', info.messageId);
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error occurred');
  } finally {
    await acceptAntragPool.close();
  }
});


// Create server
var server = http.createServer(app);
server.listen(8000, '127.0.0.1', function () {
  console.log('Server listening on port 8000');
});
