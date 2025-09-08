const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');

require('dotenv').config();
require('./config-passport');

const app = express();
app.use(express.json());
app.use(passport.initialize());

const secret = process.env.SECRET || 'no_secret';

const { sequelize, User, Contact } = require('./models');
const { QueryTypes } = require('sequelize');


async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('Connection established successfully');
    } catch (e) {
        console.log('Unable to connect to database: ', e);
    }
}

async function startServer() {
    await testConnection();
    await sequelize.sync({ force: false })
    console.log("Databse & tables created");


    app.listen(3000, () => {
        console.log("Server running on localhost:3000")
    })
}

/* --- START FOR API ENDPOINTS --- */

app.post('/users', async (req, res) => {
    try {
        const user = await User.create(req.body);
        res.json(user);
    } catch (e) {
        if (e.name === 'SequelizeValidationError' || e.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ errors: e.errors.map(er => er.message) })
        }
        res.status(500).json({ error: e.message })
    }
});

app.get('/users', async (req, res) => {
    try {
        const users = await User.findAll({
            include: [{
                model: Contact,
                as: 'contacts'
            }]
        });
        res.json(users);
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
});

app.get('/users/:id', async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id, {
            include: [{
                model: Contact,
                as: 'contacts'
            }]
        });
        if (user) res.json(user);
        else res.status(404).json({ error: "User not found" })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
});

app.put('/users/:id', async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: "User not found" });
        await user.update(req.body);
        res.json(user);
    } catch (e) {
        if (e.name === 'SequelizeValidationError' || e.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ errors: e.errors.map(er => er.message) })
        }
        res.status(500).json({ error: e.message })
    }
});

app.delete('/users/:id', async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: "User not found" });
        await user.destroy();
        res.json({ message: 'User deleted' });
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
});

app.post('/users/:id/contacts', async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: "User not found" });
        const contact = await Contact.create({ ...req.body, userId: user.id });
        res.json(contact);
    } catch (e) {
        if (e.name === 'SequelizeValidationError' || e.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ errors: e.errors.map(er => er.message) })
        }
        res.status(500).json({ error: e.message })
    }
})

app.get('/contacts', async (req, res) => {
    try {
        const contacts = await Contact.findAll({
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'firstName', 'lastName']
            }]
        })
        res.json(contacts);
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

app.get('/users/:id/contacts', async (req, res) => {
    try {
        const contacts = await Contact.findAll({
            where: {
                userId: req.params.id
            }
        })
        res.json(contacts);
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

app.get('/raw/contacts-by-user/:userId', async (req, res) => {
    try {
        const userId = Number(req.params.userId);
        const sql = `
            SELECT c.id, c.email, c.phone, u.firstName, u.lastName 
            FROM Contacts c
            JOIN Users u 
            ON c.userId = u.id
            WHERE u.id = :userId
            ORDER BY c.id DESC
        `;
        const rows = await sequelize.query(sql, {
            replacements: { userId },
            type: QueryTypes.SELECT
        });
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

/* --- END FOR API ENDPOINTS --- */

/*  --- Registration Route --- */
app.post('/register', async (req, res, next) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({
            where: {
                username
            }
        });
        if (user) {
            return res.status(409).json({
                status: 'error',
                code: 409,
                message: 'Username already in use',
                data: 'Conflict'
            })
        }
        const newUser = await User.create({
            username,
            password
        });
        res.status(201).json({
            status: 'success',
            code: 201,
            data: {
                message: 'Registration successful',
                user: {
                    id: newUser.id,
                    username: newUser.username
                }
            }
        });
    } catch (error) {
        next(error);
    }
});

/*  --- Login Route --- */
app.post('/login', async (req, res, next) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({
            where: { username }
        });
        if (!user || !(await user.validPassword(password))) {
            return res.status(400).json({
                status: 'error',
                code: 400,
                message: 'Incorrect username or password',
                data: 'Bad request'
            })
        }
        const payload = {
            id: user.id,
            username: user.username
        }
        const token = jwt.sign(payload, secret, {
            expiresIn: '1h'
        });
        res.json({
            status: 'success',
            code: 200,
            data: {
                token
            }
        })
    } catch (error) {
        next(error);
    }
})

/* --- Auth Middleware --- */
const auth = (req, res, next) => {
    passport.authenticate('jwt', {
        session: false
    }, (err, user) => {
        if (!user || err) {
            return res.status(401).json({
                status: 'error',
                code: 401,
                message: 'Unauthorized',
                data: 'Unauthorized'
            })
        }
        req.user = user;
        next();
    })(req, res, next);
}


/* --- Protected Route --- */
app.get('/list', auth, (req, res) => {
    const { username } = req.user;
    res.json({
        status: 'success',
        code: 200,
        data: {
            message: `Authorisation was successful: ${username}`
        }
    })
});




startServer();