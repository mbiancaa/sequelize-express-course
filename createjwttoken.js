const jwt = require('jsonwebtoken');

const payload = {
    id: 123456,
    username: "johndoe"
};

const secret = 'secret word';

const token = jwt.sign(payload, secret);

console.log(token);