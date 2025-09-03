const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');

const app = express();
app.use(express.json());

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'database.sqlite'
});

async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('Connection established successfully');
    } catch (e) {
        console.log('Unable to connect to database: ', e);
    }
}

const User = sequelize.define(
    'User',
    {
        firstName: {
            type: DataTypes.STRING,
            allowNull: false
        },
        lastName: {
            type: DataTypes.STRING,
            allowNull: false
        },
        age: {
            type: DataTypes.INTEGER
        },
        favouriteColor: {
            type: DataTypes.STRING,
            defaultValue: 'green'
        },
        // createdAt: {
        //     type: DataTypes.DATE,
        //     defaultValue: Sequelize.NOW
        // }
    },
    {
        //Alte optiuni de configurare
        // freezeTableName: true,
        // tableName: 'Employees',
        // timestamps: true,
        // createdAt: false, 
        // updatedAt: 'lastUpdated'
    }
)

async function startServer() {
    await testConnection();
    await sequelize.sync({ force: false })
    console.log("Databse & tables created");
}

app.post('/users', async (req, res) => {
    try {
        const user = await User.create(req.body);
        res.json(user);
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
});

app.get('/users', async (req, res) => {
    try {
        const users = await User.findAll();
        res.json(users);
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
});

app.get('/users/:id', async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
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

app.listen(3000, () => {
    console.log("Server running on localhost:3000")
})


startServer();
