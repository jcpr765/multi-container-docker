const keys = require('./keys');
const redis = require('redis');

const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000
});

const sub = redisClient.duplicate();

function fib(index) {
    if (index < 2) return 1;
    return fib(index - 1) + fib(index - 2);
};

// When redis receives a  message (receives a new indice), the worker will set into a hash a key value pair of message (the fibonacci indice) : value (the fibonacci result for that indice)
sub.on('message', (channel, message) => {
    redisClient.hset('values', message, fib(parseInt(message)));
});

// Subscribe the worker to be watching for any data inserts into our redis instance
sub.subscribe('insert');