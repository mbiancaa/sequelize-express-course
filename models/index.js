const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'db.sqlite'
});

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

    }
);

const Contact = sequelize.define('Contact', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: {
                msg: 'Invalid e-mail!'
            },
            notEmpty: {
                msg: "E-mail cannot be null"
            }
        },
        set(value) {
            if (value == null) return this.setDataValue('email', '');
            this.setDataValue('email', String(value).toLowerCase().trim())
        }
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: false,
        set(value) {
            const digits = String(value || '').replace(/\D/g, '');
            this.setDataValue('phone', digits);
        },
        validate: {
            isNumeric: {
                msg: 'Phone number must contain only numbers.'
            },
            len: {
                args: [7, 15],
                msg: 'Phone number must contain between 7 and 15 chars.'
            }
        }
    },
    maskedPhone: {
        type: DataTypes.VIRTUAL,
        get() {
            const p = this.getDataValue('phone'); // 07458845
            if (!p) return null;
            return p.replace(/\d(?=\d{4})/g, '*');  //****8845
        }
    },
},
    {
        tableName: 'Contacts'
    });

User.hasMany(Contact, {
    foreignKey: 'userId',
    as: 'contacts',
    onDelete: 'CASCADE'
});

Contact.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});

module.exports = { sequelize, User, Contact }