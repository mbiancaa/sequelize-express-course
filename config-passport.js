const passport = require('passport');
const passportJWT = require('passport-jwt');

const { User } = require('./models');

require('dotenv').config();
const secret = process.env.SECRET || 'no_secret';

const ExtractJWT = passportJWT.ExtractJwt;
const Strategy = passportJWT.Strategy;
const params = {
    secretOrKey: secret,
    jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken()
};

passport.use(
    new Strategy(params, async function (payload, done) {
        try {
            const user = await User.findOne({
                where: {
                    id: payload.id
                }
            })
            if (!user) {
                return done(null, false, {
                    message: "User not found"
                })
            }

            return done(null, user);
        } catch (e) {
            return done(e);
        }
    })
);
module.exports = passport; 