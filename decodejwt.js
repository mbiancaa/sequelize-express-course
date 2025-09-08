const jwt = require('jsonwebtoken');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIzNDU2LCJ1c2VybmFtZSI6ImpvaG5kb2UiLCJpYXQiOjE3NTczNTA3NjN9.Ig7QNBjTkHed2Yf9Ri9BteFZgE5M47a4fIi_T2epxGw';

const decode = jwt.decode(token);

console.log(decode);