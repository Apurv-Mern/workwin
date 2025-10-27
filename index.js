const express = require('express')
const app = express()
const config = require("config");
const path = require("path");
let protcol = config.get("serverProtocal");
// const sessionModel = require('./models/Session');
const fs = require("fs");
const compression = require("compression");
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');

if (protcol == "https") {
    httpsOptions = module.exports = {
        key: fs.readFileSync("/var/www/ssl_files/ssl_24.key"),
        cert: fs.readFileSync("/var/www/ssl_files/ssl_24.cert"),
        ca: fs.readFileSync("/var/www/ssl_files/ca_24.cert"),
    };
    console.log('httpsOptions :>> ', httpsOptions);
    console.log("https Server Started2");
    server = require("https").createServer(httpsOptions, app);
} else {
    console.log("http Server Started3");
    server = require("http").createServer(app);
};

const { connectToDatabase } = require("./startup/database");
const GameResetCron = require('./utils/cronjobs');
connectToDatabase();

// Serve static files from the "uploads" folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/badges', express.static(path.join(__dirname, 'badges')));
app.use('/streaks', express.static(path.join(__dirname, 'streaks')));
app.use(express.urlencoded({ extended: true })); // ✅ Add this line
app.use(express.json()); // optional, good for parsing JSON bodies

// Swagger definition
const swaggerOptions = {
    swaggerDefinition: {
        openapi: "3.0.0",
        info: {
            title: "API Documentation",
            version: "1.0.0",
            description: "API Information",
        },
        servers: [
            {
                url: "http://localhost:3008",
            },
        ],
    },
    apis: ["./routes/v1/user/*.js"], // Path to the API docs
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

require("./startup/routes")(app);

app.get('/reset-password', (req, res) => {
    const token = req.query.token;
    const html = fs.readFileSync(path.join(__dirname, "./views/password-reset.html"), "utf8");
    const htmlWithToken = html.replace("{{token}}", token);
    res.send(htmlWithToken);
});

app.use(compression({ flush: require('zlib').Z_SYNC_FLUSH }));

// Serve static files from /public before any other route
app.use('/public', express.static(path.join(__dirname, 'public')));

// Your other routes
app.get("/test1", (req, res) => {
    res.status(200).send("0OK");
});

const PORT = 3008;
server.listen(PORT, '0.0.0.0', () => {

    // Initialize Game Reset Cron Job
    GameResetCron.initialize()

    console.log(`Server running on port ${PORT}`);
});
