const express = require('express')
const app = express()
const config = require("config");
const path = require("path");
let protcol = config.get("serverProtocal");
// const sessionModel = require('./models/Session');
const fs = require("fs");
const compression = require("compression");
if (protcol == "https") {
    httpsOptions = module.exports = {
       key: fs.readFileSync("/var/www/ssl_files/ssl_24.key"),
       cert: fs.readFileSync("/var/www/ssl_files/ssl_24.cert"),
       ca: fs.readFileSync("/var/www/ssl_files/ca_24.cert"),
    };
    console.log('httpsOptions :>> ', httpsOptions);
    console.log("https Server Started2");
    server = require("https").createServer(httpsOptions, app);
    // console.log("http Server Started382");
    // server = require("https").createServer(app);
} else {
    console.log("http Server Started3");
    server = require("http").createServer(app);
};
const { connectToDatabase } = require("./startup/database");
connectToDatabase();
require("./startup/routes")(app);

app.use(compression({ flush: require('zlib').Z_SYNC_FLUSH }));

// Serve static files from /public before any other route
app.use('/public', express.static(path.join(__dirname, 'public')));

// Your other routes
app.get("/test1", (req, res) => {
    res.status(200).send("0OK");
});


// Catch-all route for React app AFTER static files and API routes
// app.get('*', (req, res) => {
//   if (req.originalUrl.startsWith('/api/')) {
//     return res.status(404).json({ error: 'API route not found' });
//   } else if (req.originalUrl.startsWith('/public/')) {
//     // Serve static files in /public
//     res.sendFile(path.join(__dirname, req.originalUrl));
//   } else {
//     res.sendFile(path.join(__dirname, 'build', 'index.html'));
//   }
// });
const PORT = 3008;
server.listen(PORT, '127.0.0.1', () => {
    console.log(`Server running on port ${PORT}`);
});
