const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');

const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

require('dotenv').config();
require('./config-passport');

const app = express();
app.use(express.json());
app.use(passport.initialize());

const secret = process.env.SECRET || 'no_secret';

const { sequelize, User, Contact, TokenBlacklist } = require('./models');
const { QueryTypes } = require('sequelize');

const uploadDir = path.join(process.cwd(), 'uploads');
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir)
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage });

app.use('/uploads', express.static(uploadDir));
app.use(express.static(process.cwd()));


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

    try {
        await fs.access(uploadDir);
        console.log("uploads directory exists.");
    } catch (e) {
        await fs.mkdir(uploadDir);
        console.log("uploads directory created.");
    }

    app.listen(3000, () => {
        console.log("Server running on localhost:3000")
    })
}

/* --- START Gallery API Endpoints --- */
app.get('/gallery', async (req, res) => {
    try {
        const files = await fs.readdir(uploadDir);
        res.json(files);
    } catch (e) {
        res.status(500).json({ message: "Error on reading files" })
    }
});

app.post('/upload', upload.single('picture'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
    }
    res.json({ message: "File successfully uploaded", file: req.file.filename });
})

app.delete('/delete/:filename', async (req, res) => {
    const filePath = path.join(uploadDir, req.params.filename);
    try {
        await fs.unlink(filePath);
        res.json({ message: "File successfully deleted" });
    } catch (e) {
        res.status(500).json({ message: "Error on deleting file" })
    }
})
/* --- END Gallery API Endpoints --- */

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
    passport.authenticate('jwt', { session: false }, async (err, user) => {
        try {
            if (err || !user) {
                return res.status(401).json({
                    status: 'error',
                    code: 401,
                    message: 'Unauthorized',
                    data: 'Unauthorized'
                });
            }

            const token = req.headers['authorization']?.split(' ')[1];
            if (!token) {
                return res.status(401).json({
                    status: 'error',
                    code: 401,
                    message: 'Missing token.',
                    data: 'Unauthorized'
                });
            }

            const blacklisted = await TokenBlacklist.findOne({ where: { token } });
            if (blacklisted) {
                return res.status(401).json({
                    status: 'error',
                    code: 401,
                    message: 'Token invalid.',
                    data: 'Unauthorized'
                });
            }

            req.user = user;
            next();
        } catch (error) {
            console.error("Auth middleware error:", error);
            res.status(500).json({
                status: 'error',
                code: 500,
                message: 'Internal server error',
                data: error.message
            });
        }
    })(req, res, next);
};



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

/* --- Logout --- */
app.post('/logout', auth, async (req, res) => {
    try {
        const token = req.headers['authorization']?.split(' ')[1];
        if (!token) {
            return res.status(400).json({ message: "Missing token" });
        }
        await TokenBlacklist.create({ token });
        res.json({
            status: 'success',
            code: 200,
            message: "Logout successful, token invalidated"
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
})



startServer();