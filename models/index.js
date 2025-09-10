const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'new_db.sqlite'
});

const User = sequelize.define(
    'User',
    {
        username: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                notEmpty: {
                    msg: 'Username cannot be empty'
                }
            }
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: 'Password cannot be empty'
                }
            }
        },
        firstName: {
            type: DataTypes.STRING,
            allowNull: true
        },
        lastName: {
            type: DataTypes.STRING,
            allowNull: true
        },
        age: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        favouriteColor: {
            type: DataTypes.STRING,
            allowNull: true
        },

    },
    {
        hooks: {
            beforeCreate: async (user, options) => {
                if (user.password) {
                    const salt = await bcrypt.genSalt(10);
                    user.password = await bcrypt.hash(user.password, salt)
                }
            },
            beforeUpdate: async (user, options) => {
                if (user.changed('password')) {
                    const salt = await bcrypt.genSalt(10);
                    user.password = await bcrypt.hash(user.password, salt);
                }
            }
        }
    }
);

const TokenBlacklist = sequelize.define("TokenBlacklist", {
    token: {
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true
    }
});

User.prototype.validPassword = async function (password) {
    return await bcrypt.compare(password, this.password);
}

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

module.exports = { sequelize, User, Contact, TokenBlacklist }