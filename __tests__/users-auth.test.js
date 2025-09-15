const request = require('supertest');
const { app } = require('../app');

describe('Users & Auth Endpoints', () => {
    //Test 1: 
    test('Register -> Login -> access protected /list and cleanup', async () => {
        const username = `testuser_${Date.now()}`;
        const password = 'Pass123!';

        const regRes = await request(app)
            .post('/register')
            .send({ username, password });

        expect(regRes.statusCode).toBe(201);
        expect(regRes.body).toHaveProperty('data.user.id');
        expect(regRes.body.data.user.username).toBe(username);

        const userId = regRes.body.data.user.id;

        const loginRes = await request(app)
            .post('/login')
            .send({ username, password });

        expect(loginRes.statusCode).toBe(200);
        expect(loginRes.body).toHaveProperty('data.token');

        const token = loginRes.body.data.token;

        const listRes = await request(app)
            .get('/list')
            .set('Authorization', `Bearer ${token}`);

        expect(listRes.statusCode).toBe(200);
        expect(listRes.body.data.message).toContain(username);

        const delRes = await request(app).delete(`/users/${userId}`);
        expect(delRes.statusCode).toBe(200);

        expect(delRes.body).toHaveProperty('message', 'User deleted');
    });

    test('Login with wrong password -> returns 400', async () => {
        const username = `wrongpass_${Date.now()}`;
        const password = 'correct_password';
        const wrongPassword = "bad_pass";

        const regRes = await request(app)
            .post('/register')
            .send({ username, password });

        expect(regRes.statusCode).toBe(201);
        expect(regRes.body).toHaveProperty('data.user.id');
        const userId = regRes.body.data.user.id;

        const loginFailRes = await request(app)
            .post('/login')
            .send({ username, password: wrongPassword });

        expect(loginFailRes.statusCode).toBe(400);
        expect(loginFailRes.body).toHaveProperty('message', 'Incorrect username or password');

        const delRes = await request(app).delete(`/users/${userId}`);
        expect(delRes.statusCode).toBe(200);

        expect(delRes.body).toHaveProperty('message', 'User deleted');
    });

    test('GET /users/:id for non-existing user returns 404', async () => {
        const nonExistingId = 99999999;
        const res = await request(app).get(`/users/${nonExistingId}`);
        expect(res.statusCode).toBe(404);
        expect(res.body).toHaveProperty('error', 'User not found');
    });
});