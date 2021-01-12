const keys = require('./keys');

// Express App Setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

// Create a new Express application
const app = express();
// Wire up CORS - to allow us to make requests from one domain to another
app.use(cors());
// Lets us parse incoming requests from the requests from the React app. Parses the body of the requests in to JSON
app.use(bodyParser.json());

// Postgres Client Setup
const { Pool } = require('pg');
const pgClient = new Pool({
    user: keys.pgUser,
    host: keys.pgHost,
    database: keys.pgDatabase,
    password: keys.pgPassword,
    port: keys.pgPort
});

// Connect to the Postgres DB and create the values table if it doesn't exist
pgClient.on('connect', () => {
    pgClient.query('CREATE TABLE IF NOT EXISTS values (number INT)')
    .catch((err) => console.log(err));
});

// Redis Client Setup
const redis = require('redis');
redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort, 
    retry_strategy: () => 1000
});
// We create a duplicate connection because according to the Redis docs, if we ever have a client that is listening or publishing information on redis we must have a client for each individual purpose
const redisPublisher = redisClient.duplicate();

// Express route handlers

app.get('/', (req, res) => {
    res.send('Hi');
});

app.get('/values/all', async (req, res) => {
    const values = await pgClient.query('SELECT * from values');

    res.send(values.rows);
});

app.get('/values/current', async (req, res) => {
    redisClient.hgetall('values', (err, values)=> {
        res.send(values);
    });
});

app.post('/values', async (req, res) => {
    const index = req.body.index;

    if (parseInt(index > 40)) {
        return res.status(422).send('Index too high');
    }

    // Set the values to "Nothing yet!" While the worker sets the proper fibonacci value
    redisClient.hset('values', index, 'Nothing yet!');
    // Publish an "insert" event, which will be the message that wakes up the worker
    redisPublisher.publish('insert', index);
    // Add in the new index that was submitted
    pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);

    res.send({working: true});
});

app.listen(5000, err => {
    console.log('Listening');
});